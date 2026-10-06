import type { Metadata } from "next";
import Link from "next/link";
import ContactForm from "@/components/legal/ContactForm";
import { orPlaceholder, readSiteInfo } from "@/lib/site-info";
import { readSocial } from "@/lib/social";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Get in touch with the Visit Taita team.",
};
export const revalidate = 3600;

export default function ContactPage() {
  const info = readSiteInfo();
  const social = readSocial();
  return (
    <div className="px-6 py-16">
      <div className="mx-auto grid max-w-5xl gap-14 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="font-body text-sm text-rust">Visit Taita</p>
          <h1 className="mt-1 font-display text-4xl text-stone sm:text-5xl">Contact us</h1>
          <p className="mt-4 max-w-prose font-body text-lg text-stone/70">
            A question, an idea, a correction or a privacy request — write to us and a real person will reply.
          </p>

          <dl className="mt-8 flex flex-col gap-4 font-body">
            <div>
              <dt className="text-xs text-stone/50">Email</dt>
              <dd className="text-stone">{orPlaceholder(info.contactEmail)}</dd>
            </div>
            {info.phone && (
              <div>
                <dt className="text-xs text-stone/50">Phone</dt>
                <dd className="text-stone">{info.phone}</dd>
              </div>
            )}
            {social.whatsapp && (
              <div>
                <dt className="text-xs text-stone/50">WhatsApp</dt>
                <dd>
                  <a href={social.whatsapp.link()} target="_blank" rel="noopener noreferrer" className="text-stone underline hover:text-rust">
                    {social.whatsapp.display}
                  </a>
                </dd>
              </div>
            )}
            {social.instagram && (
              <div>
                <dt className="text-xs text-stone/50">Instagram</dt>
                <dd>
                  <a href={social.instagram.url} target="_blank" rel="noopener noreferrer" className="text-stone underline hover:text-rust">
                    @{social.instagram.handle}
                  </a>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-stone/50">Address</dt>
              <dd className="text-stone">{orPlaceholder(info.address)}</dd>
            </div>
          </dl>

          <p className="mt-8 max-w-prose font-body text-sm text-stone/60">
            Hosting a stay or an experience? <Link href="/partners" className="underline hover:text-rust">Become a partner</Link>. Interested in sponsoring?{" "}
            <Link href="/sponsors" className="underline hover:text-rust">See sponsorship packages</Link>. Want your data? Sign in and use your{" "}
            <Link href="/account" className="underline hover:text-rust">account page</Link>.
          </p>
        </div>

        <div>
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
