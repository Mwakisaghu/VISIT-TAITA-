import Link from "next/link";
import Logo from "@/components/brand/Logo";
import FooterGroup from "@/components/footer/FooterGroup";
import SocialLinks from "@/components/social/SocialLinks";
import { BRAND } from "@/lib/brand";
import { readSiteInfo } from "@/lib/site-info";
import { readSocial } from "@/lib/social";

const worlds = ["Taita Stories", "Taita Sport", "Taita Made", "Taita Wild", "Taita Trails", "Taita Sounds", "Taita Week", "Taita Passport"];

// Grouped by what a visitor is trying to do, not by who owns the page.
const explore = [
  { href: "/discover", label: "Discover" }, { href: "/map", label: "Map" }, { href: "/stay", label: "Stay" },
  { href: "/experiences", label: "Experiences" }, { href: "/events", label: "Events" }, { href: "/stories", label: "Stories" },
];
const planJoin = [
  { href: "/plan", label: "Plan your day" }, { href: "/shop", label: "Shop · Taita Made" }, { href: "/passport", label: "Taita Passport" },
  { href: "/notes", label: "Field Notes" }, { href: "/creators", label: "Field Crew" }, { href: "/missions", label: "Missions" },
];
const workWithUs = [{ href: "/partners", label: "Become a partner" }, { href: "/sponsors", label: "Sponsorship" }, { href: "/contact", label: "Contact the team" }];

const linkClass = "focus-ring inline-block rounded-sm py-1 transition-colors hover:text-ochre";
const external = { target: "_blank", rel: "noopener noreferrer" } as const;

/**
 * The site footer. The logo is drawn in the surrounding text colour, so it is the white version on this dark background.
 * Three groups by intent (they fold into sections on a phone), the social icons for the accounts that have been set up, and one quiet legal row.
 * Social accounts and contact details appear only when they have been set (see .env.example): no dead links.
 */
export default function Footer() {
  const social = readSocial(); const info = readSiteInfo();
  return (
    <footer className="bg-stone text-parchment/80 print:hidden">
      <div className="mx-auto max-w-6xl px-6 pb-12 pt-14 sm:pt-16 sm:pb-10">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_2fr] lg:gap-16">
          <div>
            <Link href="/" aria-label={`${BRAND.name} — home`} className="focus-ring inline-block rounded-sm"><Logo decorative className="h-20 w-auto text-parchment sm:h-24" /></Link>
            <p className="mt-5 font-display text-2xl text-parchment">{BRAND.tagline}</p>
            <p className="mt-2 max-w-xs font-body text-sm leading-relaxed">{BRAND.description}</p>
            <p className="mt-3 font-body text-sm text-parchment/70">Taita Taveta, Kenya</p>
            <SocialLinks className="mt-6" />
          </div>

          <div className="grid gap-x-10 sm:grid-cols-3">
            <FooterGroup title="Explore">
              {explore.map((l) => <li key={l.href}><Link href={l.href} className={linkClass}>{l.label}</Link></li>)}
            </FooterGroup>
            <FooterGroup title="Plan & join">
              {planJoin.map((l) => <li key={l.href}><Link href={l.href} className={linkClass}>{l.label}</Link></li>)}
            </FooterGroup>
            <FooterGroup title="Work with us">
              {workWithUs.map((l) => <li key={l.href}><Link href={l.href} className={linkClass}>{l.label}</Link></li>)}
              {info.contactEmail && <li><a href={`mailto:${info.contactEmail}`} className={linkClass}>{info.contactEmail}</a></li>}
              {social.whatsapp && <li><a href={social.whatsapp.link()} {...external} className={linkClass}>WhatsApp · {social.whatsapp.display}</a></li>}
              {info.phone && <li className="py-1">{info.phone}</li>}
              {info.address && <li className="max-w-[16rem] py-1 leading-relaxed">{info.address}</li>}
            </FooterGroup>
          </div>
        </div>

        <div className="mt-12 border-t border-parchment/10 pt-6">
          <p className="hidden font-body text-xs leading-relaxed text-parchment/70 sm:block"><span className="text-parchment/85">The Taita worlds · </span>{worlds.join(" · ")}</p>
          <div className="flex flex-col gap-3 font-body text-xs text-parchment/75 sm:mt-5 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} {BRAND.name}™. Preview build — not yet live.</p>
            <nav aria-label="Legal and about" className="flex flex-wrap gap-x-6 gap-y-1">
              {[["/about", "About"], ["/privacy", "Privacy"], ["/terms", "Terms"], ["/contact", "Contact"]].map(([href, label]) => <Link key={href} href={href} className={`${linkClass} min-h-[44px] py-3`}>{label}</Link>)}
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
