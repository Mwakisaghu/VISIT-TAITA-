import type { IconName } from "@/lib/admin-nav";

const PATHS: Record<IconName, React.ReactNode> = {
  home: <><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>,
  pin: <><path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  bed: <><path d="M3 19V6M3 15h18v4M21 15v-3a3 3 0 00-3-3h-8v6" /><circle cx="7" cy="11" r="1.6" /></>,
  bag: <><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 016 0v2" /></>,
  trophy: <><path d="M8 4h8v5a4 4 0 01-8 0V4z" /><path d="M8 6H5v1a3 3 0 003 3M16 6h3v1a3 3 0 01-3 3M12 13v4M9 20h6" /></>,
  cal: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 19a6 6 0 0112 0" /><path d="M16 5.5a3 3 0 010 5.5M18 19a5 5 0 00-3-4.5" /></>,
  heart: <path d="M12 20s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.5-7 10-7 10z" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
  shield: <path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3z" />,
  search: <><circle cx="11" cy="11" r="6" /><path d="M20 20l-4-4" /></>,
  bell: <><path d="M6 16v-5a6 6 0 1112 0v5l2 2H4l2-2z" /><path d="M10 21h4" /></>,
  ext: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" />,
  chev: <path d="M9 6l6 6-6 6" />,
  chevd: <path d="M6 9l6 6 6-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  check: <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.7 2.7L16 9.5" /></>,
  cash: <><rect x="3" y="7" width="18" height="10" rx="2" /><circle cx="12" cy="12" r="2.5" /></>,
  star: <path d="M12 4l2.4 5 5.4.7-4 3.7 1 5.4-4.8-2.7L7.2 18.8l1-5.4-4-3.7 5.4-.7L12 4z" />,
  note: <><path d="M6 3h9l4 4v14H6V3z" /><path d="M14 3v5h5M9 13h7M9 17h5" /></>,
};

/** A small line picture for the admin area. Always decorative (hidden from screen readers): the words next to it say what it is. */
export default function AdminIcon({ name, size = 18, className = "" }: { name: IconName; size?: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={`shrink-0 ${className}`}>{PATHS[name]}</svg>;
}
