"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { ADMIN_ROLES, authOptions } from "@/lib/auth";
import { processDueEmails, retryEmailNow } from "@/lib/email-outbox";
import { prisma } from "@/lib/prisma";

export type EmailAdminResult = { success?: true; message?: string; error?: string };

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) throw new Error("Admin access required.");
}

function failure(err: unknown): EmailAdminResult {
  if (err instanceof Error && /Admin access/.test(err.message)) return { error: "Admin access required." };
  console.error("[email-admin] failed", err);
  return { error: "Something went wrong — please try again." };
}

function refresh() {
  revalidatePath("/admin/emails");
  revalidatePath("/admin");
}

/** Send one email now (after fixing whatever was wrong). */
export async function retryEmail(id: string): Promise<EmailAdminResult> {
  try {
    await requireAdmin();
    const outcome = await retryEmailNow(String(id));
    refresh();
    return outcome.ok ? { success: true, message: outcome.message } : { error: outcome.error };
  } catch (err) {
    return failure(err);
  }
}

/** Retry everything that's due. */
export async function retryDueEmails(): Promise<EmailAdminResult> {
  try {
    await requireAdmin();
    const s = await processDueEmails(50);
    refresh();
    if (!s.configured) return { error: "Email isn't configured (RESEND_API_KEY / EMAIL_FROM), so nothing can be sent." };
    if (s.due === 0) return { success: true, message: "Nothing is due right now." };
    return { success: true, message: `Tried ${s.due}: ${s.sent} sent, ${s.retrying} will retry, ${s.gaveUp} given up.` };
  } catch (err) {
    return failure(err);
  }
}

/** Remove a log entry (and its stored message) for good. */
export async function discardEmail(id: string): Promise<EmailAdminResult> {
  try {
    await requireAdmin();
    const found = await prisma.emailLog.findUnique({ where: { id: String(id) }, select: { id: true } });
    if (!found) return { error: "Email not found." };
    await prisma.emailLog.delete({ where: { id: found.id } });
    refresh();
    return { success: true };
  } catch (err) {
    return failure(err);
  }
}
