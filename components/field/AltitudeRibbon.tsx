import { RIBBON_SCALE, ZONE_LABEL, altitudeZone, formatMetres, ribbonPosition } from "@/lib/field-guide";

// A drawn elevation profile, plains on the left to the highest hills on the right, with one marker where this place sits.
// The profile is one smooth rise sampled into a path, so the marker is always exactly on the line.
// The words are ordinary page text laid over the drawing (not text inside the picture), so they stay a readable size on a phone.
const W = 640, H = 104, BASE = 84;
const rise = (t: number) => BASE - 62 * (t * t * (3 - 2 * t)); // smoothstep
const pts = Array.from({ length: 41 }, (_, i) => { const t = i / 40; return [t * W, rise(t)] as const; });
const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
const area = `${line} L${W} ${H} L0 ${H}Z`;

export default function AltitudeRibbon({ altitudeM, name, showZones = true, className = "" }: { altitudeM: number; name?: string; showZones?: boolean; className?: string }) {
  const t = ribbonPosition(altitudeM); const x = t * W; const y = rise(t); const zone = ZONE_LABEL[altitudeZone(altitudeM)];
  // The label sits centred above the marker, clear of the rising curve (so it is always on the light page, never on the dark fill);
  // only near the two ends does it lean inwards so it stays inside the picture.
  const shift = t < 0.15 ? "translate(-6px, calc(-100% - 12px))" : t > 0.85 ? "translate(calc(-100% + 6px), calc(-100% - 12px))" : "translate(-50%, calc(-100% - 12px))";
  return (
    <div role="img" className={`w-full ${className}`} aria-label={`${name ? name + " sits" : "Sits"} at ${formatMetres(altitudeM)}, in the ${zone.toLowerCase()}. The ribbon runs from ${formatMetres(RIBBON_SCALE.min)} on the plains to ${formatMetres(RIBBON_SCALE.max)} in the highest hills.`}>
      <div className="relative pt-6">
        <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="block h-auto w-full">
          <defs>
            <linearGradient id="ribbon-fill" x1="0" x2="1"><stop offset="0" stopColor="#C99A3E" stopOpacity=".55" /><stop offset=".55" stopColor="#2B4736" stopOpacity=".85" /><stop offset="1" stopColor="#1D3126" /></linearGradient>
          </defs>
          <path d={area} fill="url(#ribbon-fill)" />
          <path d={line} fill="none" stroke="#1B1815" strokeWidth="1.5" />
          <line x1={x} y1={y} x2={x} y2={H} stroke="#A6431E" strokeWidth="1.5" strokeDasharray="3 3" />
          <circle cx={x} cy={y} r="6.5" fill="#A6431E" stroke="#ECE3CD" strokeWidth="2" />
        </svg>
        <span aria-hidden="true" data-ribbon-label className="absolute whitespace-nowrap font-body text-xs font-bold text-stone" style={{ left: `${t * 100}%`, top: `calc(1.5rem + ${((y / H) * 100).toFixed(2)}%)`, transform: shift }}>
          {name ? `${name} · ` : ""}{formatMetres(altitudeM)}
        </span>
      </div>
      {showZones && (
        <div aria-hidden="true" className="mt-1.5 flex justify-between font-body text-[0.65rem] font-bold uppercase tracking-[0.2em] text-stone/80">
          <span>Plains</span><span>Foothills</span><span>Highlands</span>
        </div>
      )}
    </div>
  );
}
