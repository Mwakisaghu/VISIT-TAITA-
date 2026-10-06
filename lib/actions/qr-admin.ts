"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { ADMIN_ROLES, authOptions } from "@/lib/auth";
import { DEFAULT_LINKS, normaliseSlug, validateTarget } from "@/lib/go";
import { prisma } from "@/lib/prisma";

export type QrAdminResult = { success?: true; id?: string; message?: string; error?: string };

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) return null;
  return session.user;
}

const text = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string).trim() : "");

/**
 * Creates a link (id = null) or edits one. On an EXISTING link the address (slug) is never changed — it is printed on shirts —
 * only its label, where it goes, and whether it is switched on. There is deliberately no delete.
 */
export async function saveShortLink(id: string | null, formData: FormData): Promise<QrAdminResult> {
  if (!(await requireAdmin())) return { error: "Admin access required." };

  const label = text(formData, "label");
  if (label.length < 2 || label.length > 80) return { error: "Give the link a short name (2–80 characters) so you can recognise it later." };
  const target = validateTarget(formData.get("target"));
  if (!target.ok) return { error: target.error };

  if (id) {
    const existing = await prisma.shortLink.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return { error: "That link no longer exists." };
    await prisma.shortLink.update({ where: { id }, data: { label, target: target.target, active: formData.get("active") === "on" } });
    revalidatePath("/admin/qr");
    revalidatePath(`/admin/qr/${id}`);
    return { success: true, id, message: "Saved. Every printed copy now goes to the new address." };
  }

  const slug = normaliseSlug(formData.get("slug"));
  if (!slug) return { error: "The short address can use lowercase letters, numbers and hyphens (1–30 characters), e.g. hills." };
  if (await prisma.shortLink.findUnique({ where: { slug }, select: { id: true } })) return { error: `/go/${slug} already exists.` };
  const made = await prisma.shortLink.create({ data: { slug, label, target: target.target, active: true } });
  revalidatePath("/admin/qr");
  return { success: true, id: made.id, message: "Link created." };
}

/** Adds any built-in link that doesn't exist yet. Never changes one that does. */
export async function addStarterLinks(): Promise<QrAdminResult> {
  if (!(await requireAdmin())) return { error: "Admin access required." };
  const existing = await prisma.shortLink.findMany({ where: { slug: { in: DEFAULT_LINKS.map((d) => d.slug) } }, select: { slug: true } });
  const have = new Set(existing.map((e: { slug: string }) => e.slug));
  const missing = DEFAULT_LINKS.filter((d) => !have.has(d.slug));
  if (missing.length > 0) await prisma.shortLink.createMany({ data: missing.map((d) => ({ slug: d.slug, label: d.label, target: d.target })), skipDuplicates: true });
  revalidatePath("/admin/qr");
  return { success: true, message: missing.length ? `Added ${missing.length} starter link${missing.length === 1 ? "" : "s"}.` : "All the starter links already exist." };
}
