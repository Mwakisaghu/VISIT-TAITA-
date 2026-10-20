import { parsePhotoCredit } from "@/lib/photo-credit";

/**
 * A quiet picture credit. "overlay" sits in a corner of the picture (inside a relative parent; use top-right where the picture has text along its bottom); "caption" sits beneath it. Pass links={false} where the picture is itself a link (a link inside a link is
 * not valid), and the credit is shown as plain text. Renders nothing when there is no credit.
 */
export default function PhotoCredit({ credit, variant = "overlay", position = "bottom-right", links = true, className = "" }: { credit: string | null | undefined; variant?: "overlay" | "caption"; position?: "bottom-right" | "top-right"; links?: boolean; className?: string }) {
  const c = parsePhotoCredit(credit); if (!c) return null;
  const a = "underline decoration-1 underline-offset-2 hover:decoration-2";
  const name = links && c.sourceUrl ? <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className={a}>{c.name}<span className="sr-only"> (opens the picture's source in a new tab)</span></a> : <>{c.name}</>;
  const lic = !c.license ? null : links && c.licenseUrl ? <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer" className={a}>{c.license}<span className="sr-only"> (opens the licence in a new tab)</span></a> : <>{c.license}</>;
  const text = <>Photo: {name}{lic && <> &middot; {lic}</>}</>;
  if (variant === "caption") return <p className={`mt-2 font-body text-xs text-stone/80 ${className}`}>{text}</p>;
  return <p className={`absolute ${position === "top-right" ? "right-2 top-2" : "bottom-2 right-2"} z-10 max-w-[85%] rounded-sm bg-stone/80 px-2 py-1 font-body text-[0.68rem] leading-snug text-parchment ${className}`}>{text}</p>;
}
