// A drawn Taita landscape: layered ridgelines, a low sun and mist. It sits behind the hero photograph, so the page looks intentional
// while a photo loads, if one fails, or if none has been chosen yet. It is generated from numbers (no image file, a few KB of markup).
function ridge(w: number, h: number, base: number, amp: number, seed: number, steps = 56): string {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const y = base + amp * (0.55 * Math.sin(t * 1.3 + seed) + 0.3 * Math.sin(t * 2.9 + seed * 2.1) + 0.15 * Math.sin(t * 6.1 + seed * 3.7));
    pts.push([(i / steps) * w, y]);
  }
  let d = `M0,${h} L0,${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1]; const [x, y] = pts[i];
    d += ` Q${px.toFixed(1)},${py.toFixed(1)} ${((px + x) / 2).toFixed(1)},${((py + y) / 2).toFixed(1)}`;
  }
  return `${d} L${w},${pts[pts.length - 1][1].toFixed(1)} L${w},${h} Z`;
}

const LAYERS = [
  { base: 560, amp: 70, seed: 0.4, fill: "#7d4f3a" }, { base: 620, amp: 85, seed: 1.9, fill: "#4b3a33" },
  { base: 690, amp: 90, seed: 3.1, fill: "#2c2a26" }, { base: 770, amp: 80, seed: 4.6, fill: "#1b221d" }, { base: 840, amp: 60, seed: 5.8, fill: "#0f1511" },
];

export default function Landscape({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="lsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0a0f0d" /><stop offset=".4" stopColor="#1c2924" /><stop offset=".66" stopColor="#a8683a" /><stop offset="1" stopColor="#f5bd6a" /></linearGradient>
        <radialGradient id="lsun" cx="1180" cy="470" r="520" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#ffe3b0" stopOpacity=".95" /><stop offset=".25" stopColor="#f2b567" stopOpacity=".55" /><stop offset="1" stopColor="#c9783a" stopOpacity="0" /></radialGradient>
        <radialGradient id="lhalo"><stop offset="0" stopColor="#fffaf0" stopOpacity="1" /><stop offset=".12" stopColor="#ffe9bd" stopOpacity=".9" /><stop offset=".4" stopColor="#ffc577" stopOpacity=".38" /><stop offset="1" stopColor="#ffb866" stopOpacity="0" /></radialGradient>
        <linearGradient id="lmist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f3dcb8" stopOpacity="0" /><stop offset=".5" stopColor="#f3dcb8" stopOpacity=".16" /><stop offset="1" stopColor="#f3dcb8" stopOpacity="0" /></linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#lsky)" />
      <rect width="1600" height="900" fill="url(#lsun)" />
      <circle cx="1180" cy="470" r="230" fill="url(#lhalo)" />
      {LAYERS.map((l, i) => (
        <g key={i}>
          <path d={ridge(1600, 900, l.base, l.amp, l.seed)} fill={l.fill} />
          {i < LAYERS.length - 1 && <rect x="-200" y={l.base + 10} width="2000" height="120" fill="url(#lmist)" className="animate-drift motion-reduce:animate-none" style={{ animationDuration: `${60 + i * 25}s`, animationDirection: i % 2 ? "reverse" : "normal" }} />}
        </g>
      ))}
    </svg>
  );
}
