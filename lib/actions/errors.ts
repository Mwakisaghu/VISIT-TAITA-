"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { purgeOldErrors } from "@/lib/error-log";
import { currentManager } from "@/lib/user-admin-server";

// Server actions are public endpoints, so each one checks FOR ITSELF that the caller is an active admin (read fresh from the database), validates everything it is given, and does nothing otherwise.
const text = (v: FormDataEntryValue | null, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max) : "");
const ID = /^[A-Za-z0-9_-]{10,40}$/;
const refresh = (id?: string) => { revalidatePath("/admin/errors"); if (id) revalidatePath(`/admin/errors/${id}`); revalidatePath("/admin"); };

/** Mark an error resolved or ignored (with an optional note), or open it again. */
export async function setErrorStatus(formData: FormData): Promise<void> {
  const actor = await currentManager(); if (!actor) return;
  const id = text(formData.get("id"), 40); const status = text(formData.get("status"), 12); const note = text(formData.get("note"), 300);
  if (!ID.test(id) || !["OPEN", "RESOLVED", "IGNORED"].includes(status)) return;
  const issue = await prisma.errorIssue.findUnique({ where: { id }, select: { id: true } }); if (!issue) return;
  await prisma.errorIssue.update({ where: { id }, data: status === "OPEN" ? { status: "OPEN", resolvedAt: null, resolvedBy: null, note: null } : { status: status as "RESOLVED" | "IGNORED", resolvedAt: new Date(), resolvedBy: actor.email, note: note || null } });
  await prisma.adminAuditLog.create({ data: { actorId: actor.id, actorEmail: actor.email, action: `error.${status.toLowerCase()}`, detail: `error issue ${id}` } });
  refresh(id);
}

/** Delete an error and everything recorded about it. Needs the box ticked, so a stray click cannot do it. */
export async function deleteErrorIssue(formData: FormData): Promise<void> {
  const actor = await currentManager(); if (!actor) return;
  const id = text(formData.get("id"), 40);
  if (!ID.test(id) || formData.get("confirm") !== "yes") return;
  const issue = await prisma.errorIssue.findUnique({ where: { id }, select: { id: true } }); if (!issue) return;
  await prisma.errorIssue.delete({ where: { id } });
  await prisma.adminAuditLog.create({ data: { actorId: actor.id, actorEmail: actor.email, action: "error.delete", detail: `error issue ${id}` } });
  refresh();
  redirect("/admin/errors");
}

/** Tidy old reports now (the scheduled job does this every day anyway). */
export async function purgeErrorsNow(): Promise<void> {
  const actor = await currentManager(); if (!actor) return;
  const r = await purgeOldErrors();
  await prisma.adminAuditLog.create({ data: { actorId: actor.id, actorEmail: actor.email, action: "error.purge", detail: `${r.events} occurrences and ${r.issues} issues removed` } });
  refresh();
}
