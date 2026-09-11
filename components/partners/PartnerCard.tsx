import { partnerTypeLabel } from "@/lib/format";

export default function PartnerCard({
  businessName,
  partnerType,
  message,
  website,
}: {
  businessName: string;
  partnerType: string;
  message: string;
  website: string | null;
}) {
  return (
    <div className="rounded-sm border border-stone/10 p-5">
      <p className="font-body text-xs text-rust">{partnerTypeLabel(partnerType)}</p>
      <p className="mt-1 font-display text-xl text-stone">{businessName}</p>
      <p className="mt-2 font-body text-sm text-stone/70 line-clamp-3">{message}</p>
      {website && (
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring mt-3 inline-block font-body text-xs text-rust hover:text-rust-deep"
        >
          Visit website ↗
        </a>
      )}
    </div>
  );
}
