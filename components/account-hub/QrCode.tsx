import { qrPath } from "@/lib/qr-code";

/** A QR code drawn as ordinary SVG shapes (white square, black squares): no raw HTML, and the address it carries is not written anywhere in the page's text, only encoded in the squares. */
export default function QrCode({ url, label, className }: { url: string; label: string; className?: string }) {
  const q = qrPath(url);
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${q.size} ${q.size}`} shapeRendering="crispEdges" className={className}>
      <rect width={q.size} height={q.size} fill="#ffffff" />
      <path d={q.d} fill="#000000" />
    </svg>
  );
}
