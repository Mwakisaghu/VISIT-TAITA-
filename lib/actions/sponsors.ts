"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions, ADMIN_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SPONSOR_LEAD_STATUSES } from "@/lib/sponsors";
import { safeHttpUrl } from "@/lib/url";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    throw new Error("Admin access required.");
  }
  return session.user;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Stable, readable slug; appends a short suffix only on collision. */
async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>) {
  const root = slugify(base) || "item";
  if (!(await exists(root))) return root;
  return `${root}-${Math.random().toString(36).slice(2, 6)}`;
}

function parseList(raw: FormDataEntryValue | null) {
  return String(raw ?? "")
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// http(s) only — z.string().url() alone also accepts schemes like javascript:
const httpUrl = z
  .string()
  .url()
  .refine((v) => safeHttpUrl(v) !== null, "Must be an http(s) URL");

function revalidateSponsorPages() {
  revalidatePath("/admin/sponsors");
  revalidatePath("/admin/sponsors/packages");
  revalidatePath("/admin");
  revalidatePath("/sponsors");
  revalidatePath("/");
  revalidatePath("/events/taita-cup");
  revalidatePath("/events/taita-week");
}

// ---------------------------------------------------------------------------
// Packages
// ---------------------------------------------------------------------------

const packageSchema = z.object({
  name: z.string().min(2).max(120),
  startingPrice: z.coerce.number().int().positive(),
  priceNote: z.string().max(60).optional().or(z.literal("")),
  rights: z.array(z.string().max(120)).default([]),
  sortOrder: z.coerce.number().int().min(0).default(0),
  status: z.enum(["DRAFT", "PUBLISHED"]),
});

export async function savePackage(id: string | null, formData: FormData) {
  await requireAdmin();
  const parsed = packageSchema.parse({
    name: formData.get("name"),
    startingPrice: formData.get("startingPrice"),
    priceNote: formData.get("priceNote") || "",
    rights: parseList(formData.get("rights")),
    sortOrder: formData.get("sortOrder") || 0,
    status: formData.get("status"),
  });

  const data = { ...parsed, priceNote: parsed.priceNote || null };

  if (id) {
    await prisma.sponsorPackage.update({ where: { id }, data });
  } else {
    const slug = await uniqueSlug(
      parsed.name,
      async (s) => !!(await prisma.sponsorPackage.findUnique({ where: { slug: s } }))
    );
    await prisma.sponsorPackage.create({ data: { ...data, slug, isDemo: false } });
  }

  revalidateSponsorPages();
  redirect("/admin/sponsors/packages");
}

export async function deletePackage(id: string) {
  await requireAdmin();
  await prisma.sponsorPackage.delete({ where: { id } });
  revalidateSponsorPages();
}

// ---------------------------------------------------------------------------
// Sponsors
// ---------------------------------------------------------------------------

const sponsorSchema = z.object({
  name: z.string().min(2).max(120),
  logo: httpUrl,
  website: httpUrl.optional().or(z.literal("")),
  packageId: z.string().optional().or(z.literal("")),
  programs: z.array(z.enum(["TAITA_CUP", "TAITA_WEEK", "TAITA_SOUND"])).default([]),
  showOnHome: z.boolean(),
  displayOrder: z.coerce.number().int().min(0).default(0),
  status: z.enum(["DRAFT", "PUBLISHED"]),
});

export async function saveSponsor(id: string | null, formData: FormData) {
  await requireAdmin();
  const parsed = sponsorSchema.parse({
    name: formData.get("name"),
    logo: formData.get("logo"),
    website: formData.get("website") || "",
    packageId: formData.get("packageId") || "",
    programs: formData.getAll("programs"),
    showOnHome: formData.get("showOnHome") === "on",
    displayOrder: formData.get("displayOrder") || 0,
    status: formData.get("status"),
  });

  const data = {
    ...parsed,
    website: parsed.website || null,
    packageId: parsed.packageId || null,
  };

  if (id) {
    await prisma.sponsor.update({ where: { id }, data });
  } else {
    const slug = await uniqueSlug(
      parsed.name,
      async (s) => !!(await prisma.sponsor.findUnique({ where: { slug: s } }))
    );
    await prisma.sponsor.create({ data: { ...data, slug, isDemo: false } });
  }

  revalidateSponsorPages();
  redirect("/admin/sponsors");
}

export async function deleteSponsor(id: string) {
  await requireAdmin();
  await prisma.sponsor.delete({ where: { id } });
  revalidateSponsorPages();
}

// ---------------------------------------------------------------------------
// Leads (admin pipeline)
// ---------------------------------------------------------------------------

type LeadUpdateResult = { success?: true; error?: string };

const leadUpdateSchema = z.object({
  status: z.enum(SPONSOR_LEAD_STATUSES),
  adminNotes: z.string().max(4000),
});

export async function updateSponsorLead(
  id: string,
  status: string,
  adminNotes: string
): Promise<LeadUpdateResult> {
  try {
    await requireAdmin();
    const parsed = leadUpdateSchema.safeParse({ status, adminNotes });
    if (!parsed.success) return { error: "Invalid status or notes." };

    await prisma.sponsorLead.update({
      where: { id },
      data: { status: parsed.data.status, adminNotes: parsed.data.adminNotes || null },
    });
  } catch {
    return { error: "Couldn't save — please try again." };
  }

  revalidatePath("/admin/sponsors/leads");
  revalidatePath(`/admin/sponsors/leads/${id}`);
  revalidatePath("/admin");
  return { success: true };
}
