// Creates the first super admin:  npm run admin:create -- --email you@example.com --name "Your Name"
// Prints a RANDOM password once. Sign in, then use "Forgot password" to choose your own.
// To make an existing account a super admin (its password is not changed):  npm run admin:create -- --email you@example.com --promote
import { PrismaClient } from "@prisma/client";
import { createSuperAdmin } from "../lib/admin-bootstrap";

const prisma = new PrismaClient();
const arg = (flag: string) => { const i = process.argv.indexOf(flag); return i >= 0 ? process.argv[i + 1] : undefined; };

createSuperAdmin(prisma as never, { email: arg("--email"), name: arg("--name"), promote: process.argv.includes("--promote") })
  .then((r) => {
    if (!r.ok) { console.error(`\n${r.error}\n`); process.exitCode = 1; return; }
    if (r.created) {
      console.log(`\nSuper admin created: ${r.email}\nPassword (shown once — save it now): ${r.password}\n\nSign in at /login, then use "Forgot password" to choose your own.\n`);
    } else {
      console.log(`\n${r.note}\n`);
    }
  })
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
