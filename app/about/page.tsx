import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Visit Taita",
  description: "Visit Taita is a destination, culture and community platform for Taita Taveta, Kenya. More than a place.",
};
export const revalidate = 3600;

const WHAT = [
  { href: "/discover", title: "Discover", text: "Destinations, trails and places worth the journey." },
  { href: "/stories", title: "Stories", text: "People, culture and nature, told by the people who know them." },
  { href: "/events", title: "Events", text: "The Taita Cup, Taita Week and everything in between." },
  { href: "/stay", title: "Stay", text: "Lodges, homestays and camps run by local hosts." },
  { href: "/experiences", title: "Experiences", text: "Guided hikes, food tours and cultural circles." },
  { href: "/shop", title: "Taita Made", text: "Local products and crafts, bought from the makers." },
  { href: "/passport", title: "The Taita Passport", text: "Check in at places, earn points, claim rewards." },
  { href: "/creators", title: "The Field Crew", text: "Storytellers who show Taita with real evidence and honest disclosure." },
];

export default function AboutPage() {
  return (
    <div>
      <section className="bg-stone px-6 py-20 text-parchment sm:py-28">
        <div className="mx-auto max-w-6xl">
          <p className="font-body text-sm tracking-wide text-ochre">About</p>
          <h1 className="mt-3 font-display text-4xl sm:text-6xl">
            More than
            <br />a place.
          </h1>
          <p className="mt-5 max-w-lg font-body text-lg text-parchment/85">
            Visit Taita is a destination, culture and community platform for Taita Taveta, Kenya — built to help people find the county, and to help the county be found on its own terms.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="font-display text-3xl text-stone">What you&apos;ll find here</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {WHAT.map((w) => (
            <Link key={w.href} href={w.href} className="focus-ring rounded-sm border border-stone/15 p-5 transition-colors hover:border-rust">
              <p className="font-display text-xl text-stone">{w.title}</p>
              <p className="mt-2 font-body text-sm text-stone/70">{w.text}</p>
            </Link>
          ))}
        </div>

        <div className="mt-16 grid gap-10 lg:grid-cols-2">
          <section>
            <h2 className="font-display text-3xl text-stone">How we work</h2>
            <ul className="mt-5 flex flex-col gap-4 font-body leading-relaxed text-stone/80">
              <li>
                <strong className="text-stone">Evidence over adjectives.</strong> We ask for specifics — what it costs, how long it takes, one honest caveat — not
                superlatives.
              </li>
              <li>
                <strong className="text-stone">Proof they were there.</strong> Field Notes are filed only after a verified check-in at the place.
              </li>
              <li>
                <strong className="text-stone">Nothing hidden.</strong> Anything hosted, gifted or sponsored is labelled, up front and in every post.
              </li>
              <li>
                <strong className="text-stone">Your data stays yours.</strong> Read the <Link href="/privacy" className="underline hover:text-rust">Privacy Policy</Link>, or download or delete your data from your account.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-3xl text-stone">Work with us</h2>
            <p className="mt-5 max-w-prose font-body leading-relaxed text-stone/80">
              Run a stay, a guided experience or a shop? <Link href="/partners" className="underline hover:text-rust">Become a partner</Link>. Want to put your name behind
              Taita&apos;s stories and events? <Link href="/sponsors" className="underline hover:text-rust">See sponsorship packages</Link>. Tell stories about Taita?{" "}
              <Link href="/creators/apply" className="underline hover:text-rust">Join the Field Crew</Link>. Or just <Link href="/contact" className="underline hover:text-rust">say hello</Link>.
            </p>
            <p className="mt-6 max-w-prose font-body text-sm text-stone/50">Visit Taita is currently a preview build and is not yet live.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
