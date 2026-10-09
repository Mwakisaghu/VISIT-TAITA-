"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ADMIN_ROLES, authOptions } from "@/lib/auth";
import { parseMaker } from "@/lib/makers";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) throw new Error("Admin access required.");
  return session.user;
}

const slugOf = (name: string) => `${name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "maker"}-${Math.random().toString(36).slice(2, 6)}`;

/** Create or update a maker. The consent tick records WHEN consent was given (and keeps the first date if saved again); unticking removes it, which hides the maker everywhere. */
export async function saveMaker(id: string | null, formData: FormData) {
  await requireAdmin();
  const parsed = parseMaker(formData);
  if (!parsed.ok) throw new Error(parsed.error);
  const { consent, experienceId, ...v } = parsed.values;

  // A workshop experience must be a real one; an id that is not is ignored.
  const exp = experienceId ? await prisma.experience.findUnique({ where: { id: experienceId }, select: { id: true } }) : null;
  const existing = id ? await prisma.maker.findUnique({ where: { id }, select: { consentGivenAt: true, slug: true } }) : null;
  const consentGivenAt = consent ? existing?.consentGivenAt ?? new Date() : null;
  const data = { ...v, consentGivenAt, experienceId: exp?.id ?? null };

  if (id) {
    await prisma.maker.update({ where: { id }, data });
    if (existing?.slug) revalidatePath(`/shop/makers/${existing.slug}`);
  } else {
    await prisma.maker.create({ data: { ...data, slug: slugOf(v.name), isDemo: false } });
  }
  revalidatePath("/admin/makers");
  revalidatePath("/shop");
  redirect("/admin/makers");
}

export async function deleteMaker(id: string) {
  await requireAdmin();
  await prisma.maker.delete({ where: { id } }); // their products stay, with no maker
  revalidatePath("/admin/makers");
  revalidatePath("/shop");
}
