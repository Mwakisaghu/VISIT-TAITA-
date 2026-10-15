"use client";

import { signOut } from "next-auth/react";
import { useI18n } from "@/lib/i18n/client";

export default function SignOutButton({ className = "" }: { className?: string }) {
  const { tr } = useI18n();
  return (
    <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className={className}>
      {tr("Sign out")}
    </button>
  );
}
