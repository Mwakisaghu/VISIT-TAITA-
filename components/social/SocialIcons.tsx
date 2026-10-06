// Simple line icons for Instagram and WhatsApp. They take their colour from the surrounding text colour.
const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, focusable: false };

export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" />
      <circle cx="12" cy="12" r="4.1" />
      <circle cx="17.3" cy="6.7" r=".9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3.2a8.8 8.8 0 0 0-7.6 13.2L3.2 20.8l4.5-1.2A8.8 8.8 0 1 0 12 3.2z" />
      <path d="M9.4 8.3c-.3.3-.6.9-.4 1.6.5 1.9 2.2 3.8 4.4 4.6.8.3 1.3 0 1.7-.4l.5-.7c.2-.3.1-.6-.2-.8l-1.2-.7c-.3-.2-.6-.1-.8.1l-.4.4c-1-.4-1.8-1.2-2.3-2.1l.4-.4c.2-.2.3-.5.1-.8L10 8.3c-.2-.3-.5-.3-.6 0z" />
    </svg>
  );
}
