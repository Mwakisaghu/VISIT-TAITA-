import { LOGO } from "@/lib/brand-paths";

/**
 * The Visit Taita logo as an inline SVG. It is drawn in the surrounding TEXT colour (currentColor), so the same component is
 * navy on a light background and white on a dark one: just set the colour with a text-* class.
 *
 *   <Logo className="h-10 w-auto text-parchment" />          full lockup
 *   <Logo variant="mark" className="h-6 w-auto text-navy" />   ridge and acacia only
 *
 * Give it a `title` when it stands alone; pass `decorative` when a link or heading next to it already says "Visit Taita".
 */
export default function Logo({
  variant = "full",
  className,
  title = "Visit Taita",
  decorative = false,
}: {
  variant?: "full" | "mark";
  className?: string;
  title?: string;
  decorative?: boolean;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={variant === "full" ? LOGO.viewBox : LOGO.markViewBox}
      fill="currentColor"
      fillRule="evenodd"
      className={className}
      {...(decorative ? { "aria-hidden": true, focusable: false } : { role: "img", "aria-label": title })}
    >
      {!decorative && <title>{title}</title>}
      {variant === "full" && <path d={LOGO.word} />}
      <path d={LOGO.land} />
    </svg>
  );
}
