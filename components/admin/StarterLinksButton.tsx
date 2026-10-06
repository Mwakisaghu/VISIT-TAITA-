"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addStarterLinks } from "@/lib/actions/qr-admin";

export default function StarterLinksButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={busy}
        onClick={async () => { setBusy(true); const r = await addStarterLinks(); setMsg(r.error ?? r.message ?? ""); setBusy(false); router.refresh(); }}
        className="focus-ring rounded-full border border-stone/20 px-5 py-2 font-body text-sm text-stone hover:border-rust hover:text-rust disabled:opacity-50"
      >
        Add the starter links
      </button>
      {msg && <span role="status" className="font-body text-sm text-stone/60">{msg}</span>}
    </div>
  );
}
