"use client";

export default function PrintButton({ label = "Print plaque" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="focus-ring rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment hover:bg-rust-deep print:hidden"
    >
      {label}
    </button>
  );
}
