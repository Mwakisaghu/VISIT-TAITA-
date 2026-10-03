"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notifySponsorLead } from "@/lib/notifications";
import { rateLimit } from "@/lib/rate-limit";
import { safeHttpUrl } from "@/lib/url";

type SponsorLeadResult = { success?: true; error?: string };

const TOO_MANY: SponsorLeadResult = {
  error: "Too many enquiries from this connection — please try again a little later.",
};
const HOUR_MS = 60 * 60 * 1000;

function clientIp() {
  const forwarded = headers().get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : null;
}

/** Let people type "company.com"; anything with an explicit scheme is left for validation. */
function normalizeWebsite(raw: FormDataEntryValue | null) {
  const value = String(raw ?? "").trim();
  if (!value) return "";
  return /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
}

const httpUrl = z
  .string()
  .url()
  .refine((v) => safeHttpUrl(v) !== null, "Must be an http(s) URL");

const leadSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  contactName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(30),
  website: httpUrl.optional().or(z.literal("")),
  budgetRange: z.string().trim().max(120).optional().or(z.literal("")),
  packageSlug: z.string().trim().max(120).optional().or(z.literal("")),
  message: z.string().trim().min(20).max(2000),
});

export async function submitSponsorLead(formData: FormData): Promise<SponsorLeadResult> {
  // Honeypot: real visitors never see or fill this field. Bots that do get a
  // normal-looking success and nothing is stored.
  if (String(formData.get("companyWebsite") ?? "").trim() !== "") {
    return { success: true };
  }

  const parsed = leadSchema.safeParse({
    companyName: formData.get("companyName"),
    contactName: formData.get("contactName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    website: normalizeWebsite(formData.get("website")),
    budgetRange: formData.get("budgetRange") || "",
    packageSlug: formData.get("packageSlug") || "",
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { error: "Please check the form — something's missing or too short." };
  }
  const data = parsed.data;

  const ip = clientIp();
  if (ip && !rateLimit(`sponsor-lead:${ip}`, 5, 10 * 60 * 1000)) return TOO_MANY;

  const email = data.email.toLowerCase();
  const recentFromEmail = await prisma.sponsorLead.count({
    where: { email, createdAt: { gte: new Date(Date.now() - HOUR_MS) } },
  });
  if (recentFromEmail >= 3) return TOO_MANY;

  let packageId: string | null = null;
  let packageName: string | null = null;
  if (data.packageSlug) {
    const pkg = await prisma.sponsorPackage.findFirst({
      where: { slug: data.packageSlug, status: "PUBLISHED" },
      select: { id: true, name: true },
    });
    if (!pkg) return { error: "That package is no longer available — please pick another." };
    packageId = pkg.id;
    packageName = pkg.name;
  }

  const lead = await prisma.sponsorLead.create({
    data: {
      companyName: data.companyName,
      contactName: data.contactName,
      email,
      phone: data.phone,
      website: data.website || null,
      budgetRange: data.budgetRange || null,
      message: data.message,
      packageId,
    },
  });

  // Saved first — a mail failure must never lose the lead.
  await notifySponsorLead(lead, packageName);

  revalidatePath("/admin/sponsors/leads");
  revalidatePath("/admin");
  return { success: true };
}
