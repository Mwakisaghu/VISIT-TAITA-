import Logo from "@/components/brand/Logo";

/**
 * A faint Visit Taita mark behind a panel. Free to draw (an inline SVG in the surrounding text colour, no blur, no image to load), never catches a tap or a click, and hidden from
 * screen readers. Place it inside a `relative overflow-hidden` panel and give it a position, a size, a colour and an opacity of about 6 to 8 percent, for example
 *   <Watermark className="-bottom-6 -right-6 h-40 w-64 text-stone opacity-[0.06]" />
 */
export default function Watermark({ className = "", variant = "full" }: { className?: string; variant?: "full" | "mark" }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute select-none ${className}`}>
      <Logo decorative variant={variant} className="h-full w-full" />
    </div>
  );
}
