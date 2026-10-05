import type { Metadata } from "next";
import Link from "next/link";
import ForgotPasswordForm from "@/components/account/ForgotPasswordForm";

export const metadata: Metadata = { title: "Forgot your password?", robots: { index: false, follow: false } };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 py-24">
      <div className="mx-auto max-w-lg">
        <p className="font-body text-sm text-rust">Visit Taita</p>
        <h1 className="mt-1 font-display text-4xl text-stone">Forgot your password?</h1>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Shell>
      <p className="mb-6 font-body text-stone/70">Enter the email address you registered with and we&apos;ll send you a link to choose a new password.</p>
      <ForgotPasswordForm />
      <p className="mt-8 font-body text-sm text-stone/60">
        Remembered it? <Link href="/login" className="text-rust hover:text-rust-deep">Sign in</Link>.
      </p>
    </Shell>
  );
}
