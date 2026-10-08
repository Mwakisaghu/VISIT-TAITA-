// Small line icons (decorative: always aria-hidden). Drawn to match the thin-border look of the rest of the page.
type P = { className?: string };
const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: false } as const;
export const PawIcon = ({ className }: P) => (<svg {...base} className={className}><circle cx="6.5" cy="10" r="1.7" /><circle cx="10" cy="6.2" r="1.7" /><circle cx="14" cy="6.2" r="1.7" /><circle cx="17.5" cy="10" r="1.7" /><path d="M12 12.2c-2.6 0-5 2.5-4.4 4.6.5 1.7 2.3 1.9 4.4 1.2 2.1.7 3.9.5 4.4-1.2.6-2.1-1.8-4.6-4.4-4.6Z" /></svg>);
export const MountainIcon = ({ className }: P) => (<svg {...base} className={className}><path d="M2.5 19 9 7.5l3.5 6 2-3L21.5 19Z" /><path d="m7.4 10.4 1.6 1.6 1.4-1.2" /></svg>);
export const PeopleIcon = ({ className }: P) => (<svg {...base} className={className}><circle cx="8" cy="8" r="2.6" /><circle cx="16.5" cy="9" r="2.1" /><path d="M2.8 19c.4-3.4 2.5-5.2 5.2-5.2s4.8 1.8 5.2 5.2" /><path d="M14.5 14.2c2.5-.6 5.2.5 5.7 4.3" /></svg>);
export const HouseIcon = ({ className }: P) => (<svg {...base} className={className}><path d="M3.5 11.2 12 4l8.5 7.2" /><path d="M5.5 10v9.5h13V10" /><path d="M10 19.5v-5h4v5" /></svg>);
export const BallIcon = ({ className }: P) => (<svg {...base} className={className}><circle cx="12" cy="12" r="8.5" /><path d="m12 8 3.4 2.5-1.3 4h-4.2l-1.3-4Z" /><path d="M12 8V3.5M15.4 10.5l4.2-1.3M14.1 14.5l2.6 3.4M9.9 14.5l-2.6 3.4M8.6 10.5 4.4 9.2" /></svg>);
export const GemIcon = ({ className }: P) => (<svg {...base} className={className}><path d="M12 3 4 11l8 10 8-10Z" /><path d="M4 11h16M9 11l3-8 3 8M9 11l3 10 3-10" /></svg>);
export const ForkIcon = ({ className }: P) => (<svg {...base} className={className}><path d="M7 3v7a2 2 0 0 0 2 2v9M11 3v7a2 2 0 0 1-2 2M9 3v7" /><path d="M17 21V3c-2.4 1.6-3.5 4.4-3.5 8H17" /></svg>);
export const CompassIcon = ({ className }: P) => (<svg {...base} className={className}><circle cx="12" cy="12" r="8.5" /><path d="m15.8 8.2-2 5.6-5.6 2 2-5.6Z" /></svg>);
export const ArrowIcon = ({ className }: P) => (<svg {...base} className={className}><path d="M4 12h15M13.5 6.5 19 12l-5.5 5.5" /></svg>);
export const SearchIcon = ({ className }: P) => (<svg {...base} className={className}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></svg>);
export const UserIcon = ({ className }: P) => (<svg {...base} className={className}><circle cx="12" cy="8.5" r="3.7" /><path d="M4.5 20c.7-4 3.6-6 7.5-6s6.8 2 7.5 6" /></svg>);
export const BagIcon = ({ className }: P) => (<svg {...base} className={className}><path d="M5 8h14l-1 12H6Z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></svg>);
export const PassportIcon = ({ className }: P) => (<svg {...base} className={className}><rect x="5" y="3" width="14" height="18" rx="1.5" /><circle cx="12" cy="11" r="3" /><path d="M9.5 17h5" /></svg>);
export const PlayIcon = ({ className }: P) => (<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable={false} className={className}><path d="M8 5.5v13l11-6.5Z" /></svg>);
export const MenuIcon = ({ className }: P) => (<svg {...base} className={className}><path d="M4 8h16M4 16h11" /></svg>);
export const CloseIcon = ({ className }: P) => (<svg {...base} className={className}><path d="m5 5 14 14M19 5 5 19" /></svg>);
