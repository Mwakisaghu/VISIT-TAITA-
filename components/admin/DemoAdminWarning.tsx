import Link from "next/link";
import { demoAdminIsInsecure, DEMO_ADMIN_EMAIL } from "@/lib/demo-admin";

/** Shown to admins while the demo account from the seed still has its published password. */
export default async function DemoAdminWarning() {
  if (!(await demoAdminIsInsecure())) return null;
  return (
    <p role="alert" className="mt-6 max-w-2xl rounded-sm border border-rust/40 bg-rust/10 p-4 font-body text-sm text-stone">
      <strong>Security warning.</strong> The demo account <code>{DEMO_ADMIN_EMAIL}</code> still has the password published in the source code, so anyone who has read
      it could sign in as a super admin. Create your own super admin (<code>npm run admin:create</code>), then{" "}
      <Link href="/admin/users?q=admin%40visittaita" className="underline">suspend this account</Link>.
    </p>
  );
}
