// The page's small line icons. They are decoration (the words beside them carry the meaning), so they are hidden from screen readers.
const PATHS = {
  car: <><path d="M5 16h14M6 16l1.6-5.2A2 2 0 0 1 9.5 9.4h5a2 2 0 0 1 1.9 1.4L18 16" /><circle cx="8" cy="17.5" r="1.5" /><circle cx="16" cy="17.5" r="1.5" /></>,
  bus: <><rect x="4" y="4" width="16" height="13" rx="2" /><path d="M4 11h16M7 20v-3M17 20v-3" /><circle cx="8" cy="14.5" r=".6" /><circle cx="16" cy="14.5" r=".6" /></>,
  train: <><rect x="6" y="3" width="12" height="14" rx="3" /><path d="M6 11h12M9 21l1.5-4M15 21l-1.5-4" /><circle cx="9.5" cy="14" r=".6" /><circle cx="14.5" cy="14" r=".6" /></>,
  cash: <><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></>,
  phone: <><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M11 18h2" /></>,
  tag: <><path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="8.5" r="1.2" /></>,
  ticket: <path d="M4 8a2 2 0 0 0 0 4v0a2 2 0 0 1 0 4v1h16v-1a2 2 0 0 1 0-4v0a2 2 0 0 0 0-4V7H4z" />,
  paw: <><circle cx="8" cy="9" r="1.6" /><circle cx="16" cy="9" r="1.6" /><circle cx="5.5" cy="13.5" r="1.6" /><circle cx="18.5" cy="13.5" r="1.6" /><path d="M12 12c-3 0-5 3-4 5.2 1 1.8 3 1.2 4 1.2s3 .6 4-1.2C17 15 15 12 12 12z" /></>,
  boot: <><path d="M6 4h5v7l7 2.5V18H6z" /><path d="M6 14h12" /></>,
  map: <><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" /><path d="M9 4v14M15 6v14" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  cross: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M12 8v8M8 12h8" /></>,
  check: <><circle cx="12" cy="12" r="8.5" /><path d="M8.5 12.2l2.4 2.4 4.6-5" /></>,
  alert: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v5M12 15.8v.1" /></>,
  call: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  warm: <><path d="M12 3v8M12 11a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" /></>,
} as const;
export type IconName = keyof typeof PATHS;
export function EssentialsIcon({ name, size = 24, className }: { name: IconName; size?: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>{PATHS[name]}</svg>;
}
