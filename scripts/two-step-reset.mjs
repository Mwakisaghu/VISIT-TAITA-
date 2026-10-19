#!/usr/bin/env node
// BREAK-GLASS: turns off someone's two-step sign-in from the command line, for when they have lost BOTH their phone and their recovery codes and no other super admin can reset them.
// It needs DATABASE_URL (the same one the site uses), so only someone who already controls the database can run it. It writes an entry to the admin audit log and signs the person out everywhere.
// Usage:   DATABASE_URL="postgresql://..." node scripts/two-step-reset.mjs person@example.org
import readline from "node:readline/promises";
import { pathToFileURL } from "node:url";

/** The reset itself, separate from the questions, so it can be tested with a stand-in database. */
export async function resetTwoStep(db, email, { now = new Date(), actor = "break-glass script" } = {}) {
  const clean = String(email ?? "").trim().toLowerCase();
  if (!clean) return { ok: false, reason: "no_email" };
  const user = await db.user.findUnique({ where: { email: clean }, select: { id: true, email: true, name: true, role: true } });
  if (!user) return { ok: false, reason: "no_such_user" };
  const had = await db.twoFactor.findUnique({ where: { userId: user.id } });
  await db.recoveryCode.deleteMany({ where: { userId: user.id } });
  await db.twoFactor.deleteMany({ where: { userId: user.id } });
  await db.user.update({ where: { id: user.id }, data: { sessionsRevokedAt: now } }); // every sign-in they have ends within minutes
  await db.adminAuditLog.create({ data: { actorEmail: actor, action: "user.twostep_reset", targetUserId: user.id, targetEmail: user.email, detail: "Two-step sign-in was reset from the command line (break-glass)." } });
  return { ok: true, user, hadTwoStep: !!had };
}

async function main() {
  const arg = process.argv[2];
  if (!arg || arg === "--help" || arg === "-h") { console.log("Usage: DATABASE_URL=... node scripts/two-step-reset.mjs person@example.org\nTurns off that person's two-step sign-in (break-glass). It asks you to type their address twice and the word RESET."); process.exit(arg ? 0 : 1); }
  if (!process.env.DATABASE_URL) { console.error("ERROR: DATABASE_URL is not set. This must be the same database the site uses."); process.exit(1); }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const again = (await rl.question(`Type the address again to confirm (${arg}): `)).trim().toLowerCase();
  if (again !== arg.trim().toLowerCase()) { console.error("The two addresses are not the same. Nothing was changed."); rl.close(); process.exit(1); }
  const word = (await rl.question("This removes their second step and signs them out everywhere. Type RESET to go ahead: ")).trim();
  rl.close(); if (word !== "RESET") { console.error("Nothing was changed."); process.exit(1); }
  const { PrismaClient } = await import("@prisma/client"); const db = new PrismaClient();
  try {
    const r = await resetTwoStep(db, arg);
    if (!r.ok) { console.error(r.reason === "no_such_user" ? "No account has that address. Nothing was changed." : "Nothing was changed."); process.exit(1); }
    console.log(`Done. ${r.user.name} (${r.user.email}, ${r.user.role}) ${r.hadTwoStep ? "no longer has two-step sign-in" : "did not have two-step sign-in set up"}, and is signed out everywhere.`);
    console.log("An entry was written to the admin audit log. Tell them by ANOTHER way (a call, not email alone) that this was done; if they must use two-step they will be asked to set it up again at their next sign-in.");
  } finally { await db.$disconnect(); }
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
