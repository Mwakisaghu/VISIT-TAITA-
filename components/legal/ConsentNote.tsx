import Link from "next/link";

export type ConsentKind = "enquiry" | "newsletter" | "lead" | "order" | "contact" | "creator";

const TEXT: Record<ConsentKind, string> = {
  enquiry:
    "We share your name, email, phone and message with the host and with Visit Taita so they can reply to you.",
  newsletter: "We'll email you a link to confirm. By confirming you agree to receive our monthly letter, and you can unsubscribe at any time.",
  lead: "We use your details to reply to your enquiry or assess your application.",
  order:
    "We share your phone and delivery address with the seller to fulfil your order, and keep order and payment records.",
  contact: "We use your details only to reply to your message.",
  creator: "We use your details to assess your application and, if approved, to publish your profile.",
};

/** A short, plain-language notice of what happens to the details in a form, with a link to the Privacy Policy. */
export default function ConsentNote({ kind, tone = "dark" }: { kind: ConsentKind; tone?: "dark" | "light" }) {
  const color = tone === "light" ? "text-parchment/80" : "text-stone/70";
  const link = tone === "light" ? "underline hover:text-ochre" : "underline hover:text-rust";
  return (
    <p data-consent={kind} className={`font-body text-xs leading-relaxed ${color}`}>
      {TEXT[kind]} See our{" "}
      <Link href="/privacy" className={link}>
        Privacy Policy
      </Link>
      .
    </p>
  );
}
