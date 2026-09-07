import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-4xl text-stone">This trail ends here.</p>
      <p className="mt-3 max-w-sm font-body text-stone/60">
        We couldn&apos;t find that page. It may have moved, or hasn&apos;t
        been mapped yet.
      </p>
      <Link
        href="/"
        className="focus-ring mt-8 rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment hover:bg-rust-deep"
      >
        Back to Visit Taita
      </Link>
    </div>
  );
}
