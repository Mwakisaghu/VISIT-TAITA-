import Link from "next/link";
import Logo from "@/components/brand/Logo";
import { InstagramIcon, WhatsAppIcon } from "@/components/social/SocialIcons";
import { BRAND } from "@/lib/brand";
import { readSiteInfo } from "@/lib/site-info";
import { readSocial } from "@/lib/social";

const worlds = ["Taita Stories", "Taita Sport", "Taita Made", "Taita Wild", "Taita Trails", "Taita Sounds", "Taita Week", "Taita Passport"];

const explore = [
  { href: "/discover", label: "Discover" },
  { href: "/map", label: "Map" },
  { href: "/stay", label: "Stay" },
  { href: "/experiences", label: "Experiences" },
  { href: "/stories", label: "Stories" },
  { href: "/events", label: "Events" },
  { href: "/shop", label: "Shop" },
  { href: "/search", label: "Search" },
];

const takePart = [
  { href: "/passport", label: "Taita Passport" },
  { href: "/creators", label: "Field Crew" },
  { href: "/missions", label: "Missions" },
  { href: "/notes", label: "Field Notes" },
  { href: "/partners", label: "Become a partner" },
  { href: "/sponsors", label: "Sponsorship" },
];

const linkClass = "focus-ring rounded-sm transition-colors hover:text-ochre";
const external = { target: "_blank", rel: "noopener noreferrer" } as const;

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-body text-sm font-semibold uppercase tracking-wider text-ochre">{title}</h2>
      <ul className="mt-4 space-y-2.5 font-body text-sm">{children}</ul>
    </div>
  );
}

/**
 * The site footer. The logo is drawn in the surrounding text colour, so it is the white version on this dark background.
 * Instagram, WhatsApp and the contact details appear only when they have been set (see .env.example): no dead links.
 */
export default function Footer() {
  const social = readSocial();
  const info = readSiteInfo();
  const hasContact = !!(social.whatsapp || social.instagram || info.contactEmail || info.phone || info.address);

  return (
    <footer className="bg-stone text-parchment/80 print:hidden">
      <div className="mx-auto max-w-6xl px-6 pb-8 pt-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <Link href="/" aria-label={`${BRAND.name} — home`} className="focus-ring inline-block rounded-sm">
              <Logo decorative className="h-28 w-auto text-parchment" />
            </Link>
            <p className="mt-6 font-display text-2xl text-parchment">{BRAND.tagline}</p>
            <p className="mt-2 max-w-xs font-body text-sm leading-relaxed">{BRAND.description}</p>

            {(social.instagram || social.whatsapp) && (
              <ul className="mt-6 flex gap-3" aria-label="Follow and message us">
                {social.instagram && (
                  <li>
                    <a
                      href={social.instagram.url}
                      {...external}
                      aria-label={`Instagram: @${social.instagram.handle}`}
                      className="focus-ring flex h-11 w-11 items-center justify-center rounded-full border border-parchment/25 text-parchment transition-colors hover:border-ochre hover:text-ochre"
                    >
                      <InstagramIcon className="h-5 w-5" />
                    </a>
                  </li>
                )}
                {social.whatsapp && (
                  <li>
                    <a
                      href={social.whatsapp.link()}
                      {...external}
                      aria-label="Chat with us on WhatsApp"
                      className="focus-ring flex h-11 w-11 items-center justify-center rounded-full border border-parchment/25 text-parchment transition-colors hover:border-ochre hover:text-ochre"
                    >
                      <WhatsAppIcon className="h-5 w-5" />
                    </a>
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* Side by side on a phone (they're short lists); from `sm` up they become ordinary grid columns. */}
          <div className="grid grid-cols-2 gap-8 sm:contents">
            <Column title="Explore">
              {explore.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={linkClass}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </Column>

            <Column title="Take part">
              {takePart.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={linkClass}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </Column>
          </div>

          <Column title="Talk to us">
            <li>
              <Link href="/contact" className={linkClass}>
                Contact the team
              </Link>
            </li>
            {social.whatsapp && (
              <li>
                <a href={social.whatsapp.link()} {...external} className={linkClass}>
                  WhatsApp · {social.whatsapp.display}
                </a>
              </li>
            )}
            {social.instagram && (
              <li>
                <a href={social.instagram.url} {...external} className={linkClass}>
                  Instagram · @{social.instagram.handle}
                </a>
              </li>
            )}
            {info.contactEmail && (
              <li>
                <a href={`mailto:${info.contactEmail}`} className={linkClass}>
                  {info.contactEmail}
                </a>
              </li>
            )}
            {info.phone && <li>{info.phone}</li>}
            {info.address && <li className="max-w-[16rem] leading-relaxed">{info.address}</li>}
            {!hasContact && <li className="max-w-[16rem] text-parchment/70">Taita Taveta, Kenya</li>}
          </Column>
        </div>

        <div className="mt-14 border-t border-parchment/10 pt-6">
          <p className="font-body text-xs leading-relaxed text-parchment/70">
            <span className="text-parchment/85">The Taita worlds · </span>
            {worlds.join(" · ")}
          </p>
          <div className="mt-5 flex flex-col gap-3 font-body text-xs text-parchment/75 md:flex-row md:items-center md:justify-between">
            <p>
              © {new Date().getFullYear()} {BRAND.name}™. Preview build — not yet live.
            </p>
            <nav aria-label="Legal and about" className="flex flex-wrap gap-x-5 gap-y-1">
              <Link href="/about" className={`${linkClass} inline-block py-2`}>
                About
              </Link>
              <Link href="/privacy" className={`${linkClass} inline-block py-2`}>
                Privacy
              </Link>
              <Link href="/terms" className={`${linkClass} inline-block py-2`}>
                Terms
              </Link>
              <Link href="/contact" className={`${linkClass} inline-block py-2`}>
                Contact
              </Link>
              <span>Taita Taveta, Kenya</span>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
