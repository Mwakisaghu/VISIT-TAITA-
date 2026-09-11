import Link from "next/link";

const worlds = [
  "Taita Stories",
  "Taita Sport",
  "Taita Made",
  "Taita Wild",
  "Taita Trails",
  "Taita Sounds",
  "Taita Passport",
];

export default function Footer() {
  return (
    <footer className="bg-stone text-parchment/80">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-3">
          <div>
            <p className="font-display text-2xl text-parchment">Visit Taita</p>
            <p className="mt-3 max-w-xs font-body text-sm leading-relaxed">
              More than a place. A destination culture, told by the people who
              live it.
            </p>
          </div>

          <div>
            <p className="font-body text-sm text-ochre">The Taita worlds</p>
            <ul className="mt-3 space-y-2 font-body text-sm">
              {worlds.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-body text-sm text-ochre">Get in touch</p>
            <ul className="mt-3 space-y-2 font-body text-sm">
              <li>
                <Link href="/partners" className="focus-ring hover:text-ochre">
                  Partners &amp; sponsors
                </Link>
              </li>
              <li>Advertise with us</li>
              <li>Contact the team</li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-2 border-t border-parchment/10 pt-6 font-body text-xs text-parchment/50 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Visit Taita. Preview build — not yet live.</p>
          <p>Taita Taveta, Kenya</p>
        </div>
      </div>
    </footer>
  );
}
