import { FacebookIcon, InstagramIcon, TikTokIcon, WhatsAppIcon, XIcon, YouTubeIcon } from "@/components/social/SocialIcons";
import { readSocial } from "@/lib/social";
import type { ReactElement } from "react";

const external = { target: "_blank", rel: "noopener noreferrer" } as const;
const btn = "focus-ring flex h-11 w-11 items-center justify-center rounded-full border border-parchment/25 text-parchment transition-colors hover:border-ochre hover:text-ochre";

/** Round icon links to the accounts that have been set up (see .env.example). Nothing at all if none are. Each is 44 px, named for screen readers, and says it opens a new tab. */
export default function SocialLinks({ className = "" }: { className?: string }) {
  const s = readSocial();
  const links = [
    s.instagram && { key: "instagram", href: s.instagram.url, name: `Instagram: @${s.instagram.handle}`, Icon: InstagramIcon },
    s.facebook && { key: "facebook", href: s.facebook.url, name: `Facebook: ${s.facebook.name}`, Icon: FacebookIcon },
    s.tiktok && { key: "tiktok", href: s.tiktok.url, name: `TikTok: @${s.tiktok.handle}`, Icon: TikTokIcon },
    s.youtube && { key: "youtube", href: s.youtube.url, name: `YouTube: ${s.youtube.label}`, Icon: YouTubeIcon },
    s.x && { key: "x", href: s.x.url, name: `X: @${s.x.handle}`, Icon: XIcon },
    s.whatsapp && { key: "whatsapp", href: s.whatsapp.link(), name: "Chat with us on WhatsApp", Icon: WhatsAppIcon },
  ].filter(Boolean) as { key: string; href: string; name: string; Icon: (p: { className?: string }) => ReactElement }[];
  if (links.length === 0) return null;
  return (
    <ul aria-label="Follow and message us" className={`flex flex-wrap gap-3 ${className}`}>
      {links.map(({ key, href, name, Icon }) => (
        <li key={key}><a href={href} {...external} aria-label={`${name} (opens in a new tab)`} className={btn}><Icon className="h-5 w-5" /></a></li>
      ))}
    </ul>
  );
}
