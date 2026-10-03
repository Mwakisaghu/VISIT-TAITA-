import Image from "next/image";
import Link from "next/link";
import DemoNotice from "@/components/DemoNotice";
import { prisma } from "@/lib/prisma";
import { safeHttpUrl } from "@/lib/url";

type StripProgram = "TAITA_CUP" | "TAITA_WEEK" | "TAITA_SOUND" | "HOME";

const LABELS: Record<StripProgram, string> = {
  TAITA_CUP: "Taita Cup is supported by",
  TAITA_WEEK: "Taita Week is supported by",
  TAITA_SOUND: "Taita Sound is supported by",
  HOME: "Our partners",
};

/**
 * Logo strip of PUBLISHED sponsors for a programme page (or the homepage).
 * Renders nothing when there are none, so pages look unchanged until a real
 * sponsor is added in /admin/sponsors.
 */
export default async function SponsorStrip({ program }: { program: StripProgram }) {
  const sponsors = await prisma.sponsor.findMany({
    where: {
      status: "PUBLISHED",
      ...(program === "HOME" ? { showOnHome: true } : { programs: { has: program } }),
    },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });

  if (sponsors.length === 0) return null;

  return (
    <section className="border-t border-stone/10 bg-parchment-dim/40 px-6 py-10" aria-label="Partners">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="font-body text-sm text-stone/60">{LABELS[program]}</p>
          <Link
            href="/sponsors"
            className="focus-ring font-body text-sm text-stone/70 transition-colors hover:text-rust"
          >
            Become a partner →
          </Link>
        </div>

        <ul className="mt-6 flex flex-wrap items-center gap-x-10 gap-y-6">
          {sponsors.map((s) => {
            const href = safeHttpUrl(s.website);
            const logo = (
              <span className="relative block h-12 w-32">
                <Image
                  src={s.logo}
                  alt={s.name}
                  fill
                  unoptimized
                  sizes="128px"
                  className="object-contain grayscale transition duration-300 group-hover:grayscale-0"
                />
              </span>
            );
            return (
              <li key={s.id}>
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.name}
                    className="focus-ring group block"
                  >
                    {logo}
                  </a>
                ) : (
                  <span className="group block">{logo}</span>
                )}
              </li>
            );
          })}
        </ul>

        {sponsors.some((s) => s.isDemo) && (
          <div className="mt-6">
            <DemoNotice>sample partners shown for layout review.</DemoNotice>
          </div>
        )}
      </div>
    </section>
  );
}
