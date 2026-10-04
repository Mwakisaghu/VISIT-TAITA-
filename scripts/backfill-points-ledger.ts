// One-time (and safe to re-run) setup for the Passport points ledger.
//
// Before the ledger, a user's points were a number on the User row. This makes
// the ledger agree with those balances by recording each difference as a
// LEGACY entry (first time) or ADJUSTMENT entry (any later mismatch).
// Users whose ledger already adds up to their balance are skipped, so running
// it twice does nothing the second time.
//
// Run AFTER the check-in engine code is deployed (never before — the old code
// recalculated points on every change):
//   npm run points:backfill -- --dry-run     # show what it would do
//   npm run points:backfill                  # apply

import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const [users, sums] = await Promise.all([
    prisma.user.findMany({ select: { id: true, email: true, points: true } }),
    prisma.pointsEntry.groupBy({ by: ["userId"], _sum: { points: true }, _count: { _all: true } }),
  ]);
  const ledger = new Map(sums.map((s) => [s.userId, { sum: s._sum.points ?? 0, count: s._count._all }]));

  let changed = 0;
  for (const user of users) {
    const entry = ledger.get(user.id) ?? { sum: 0, count: 0 };
    const diff = user.points - entry.sum;
    if (diff === 0) continue;

    changed++;
    const reason = entry.count === 0 ? "LEGACY" : "ADJUSTMENT";
    console.log(`${dryRun ? "[dry run] " : ""}${user.email}: balance ${user.points}, ledger ${entry.sum} -> ${reason} ${diff > 0 ? "+" : ""}${diff}`);

    if (!dryRun) {
      await prisma.pointsEntry.create({
        data: {
          userId: user.id,
          points: diff,
          reason,
          note:
            reason === "LEGACY"
              ? "Balance carried over from before the points ledger"
              : "Balance reconciliation",
        },
      });
    }
  }

  console.log(
    changed === 0
      ? "Ledger already matches every balance — nothing to do."
      : `${dryRun ? "Would reconcile" : "Reconciled"} ${changed} user(s).`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
