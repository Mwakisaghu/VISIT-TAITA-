import Link from "next/link";
import Logo from "@/components/brand/Logo";
import FooterGroup from "@/components/footer/FooterGroup";
import SocialLinks from "@/components/social/SocialLinks";
import { BRAND } from "@/lib/brand";
import { readSiteInfo } from "@/lib/site-info";
import { readSocial } from "@/lib/social";
import { LanguageLinks } from "@/components/i18n/LanguageSwitcher";
import { T } from "@/lib/i18n/mark";
import { lp, tr } from "@/lib/i18n/server";


// Grouped by what a visitor is trying to do, not by who owns the page.
const explore = [
  { href: "/discover", label: T("Discover") }, { href: "/map", label: T("Map") }, { href: "/stay", label: T("Stay") },
  { href: "/experiences", label: T("Experiences") }, { href: "/events", label: T("Events") }, { href: "/stories", label: T("Stories") },
];
const planJoin = [
  { href: "/plan", label: T("Plan your day") }, { href: "/essentials", label: T("Visitor essentials") }, { href: "/shop", label: T("Shop · Taita Made") }, { href: "/passport", label: T("Taita Passport") },
  { href: "/notes", label: T("Field Notes") }, { href: "/creators", label: T("Field Crew") }, { href: "/missions", label: T("Missions") },
];
const workWithUs = [{ href: "/partners", label: T("Become a partner") }, { href: "/sponsors", label: T("Sponsorship") }, { href: "/contact", label: T("Contact the team") }];

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
            <Link href={lp("/")} aria-label={`${BRAND.name} — ${tr("home")}`} className="focus-ring inline-block rounded-sm"><Logo decorative className="h-20 w-auto text-parchment sm:h-24" /></Link>
            <p className="mt-5 font-display text-2xl text-parchment">{tr(BRAND.tagline)}</p>
            <p className="mt-2 max-w-xs font-body text-sm leading-relaxed">{tr(BRAND.description)}</p>
            <p className="mt-3 font-body text-sm text-parchment/70">{tr("Taita Taveta, Kenya")}</p>
            <SocialLinks className="mt-6" />
            <div className="mt-5"><p className="font-body text-[0.65rem] font-bold uppercase tracking-[0.22em] text-parchment/70">{tr("Language")}</p><LanguageLinks className="mt-1 text-parchment/90" /></div>
          </div>

          <div className="grid gap-x-10 sm:grid-cols-3">
            <FooterGroup title={tr("Explore")}>
              {explore.map((l) => <li key={l.href}><Link href={lp(l.href)} className={linkClass}>{tr(l.label)}</Link></li>)}
            </FooterGroup>
            <FooterGroup title={tr("Plan & join")}>
              {planJoin.map((l) => <li key={l.href}><Link href={lp(l.href)} className={linkClass}>{tr(l.label)}</Link></li>)}
            </FooterGroup>
            <FooterGroup title={tr("Work with us")}>
              {workWithUs.map((l) => <li key={l.href}><Link href={lp(l.href)} className={linkClass}>{tr(l.label)}</Link></li>)}
              {info.contactEmail && <li><a href={`mailto:${info.contactEmail}`} className={linkClass}>{info.contactEmail}</a></li>}
              {social.whatsapp && <li><a href={social.whatsapp.link()} {...external} className={linkClass}>WhatsApp · {social.whatsapp.display}</a></li>}
              {info.phone && <li className="py-1">{info.phone}</li>}
              {info.address && <li className="max-w-[16rem] py-1 leading-relaxed">{info.address}</li>}
            </FooterGroup>
          </div>
        </div>

        <div className="mt-12 border-t border-parchment/10 pt-6">
          <div className="flex flex-col gap-3 font-body text-xs text-parchment/75 sm:mt-5 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} {BRAND.name}™. {tr("Preview build — not yet live.")}</p>
            <nav aria-label={tr("Legal and about")} className="flex flex-wrap gap-x-6 gap-y-1">
              {[["/about", T("About")], ["/privacy", T("Privacy")], ["/terms", T("Terms")], ["/refunds", T("Refunds")], ["/contact", T("Contact")]].map(([href, label]) => <Link key={href} href={lp(href)} className={`${linkClass} min-h-[44px] py-3`}>{tr(label)}</Link>)}
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
