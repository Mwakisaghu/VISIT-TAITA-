import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import PassportBook from "@/components/passport/book/PassportBook";
import { authOptions } from "@/lib/auth";
import { lp, tr } from "@/lib/i18n/server";
import { loadPassport } from "@/lib/passport-data";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> { return { title: tr("Your Passport"), robots: { index: false } }; }

export default async function PassportPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect(`${lp("/login")}?next=%2Fpassport`);
  const data = await loadPassport(session.user.id);
  if (!data) redirect(lp("/login"));
  return <PassportBook data={data} />;
}
