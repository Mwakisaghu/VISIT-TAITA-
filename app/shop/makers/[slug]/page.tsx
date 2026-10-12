import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DemoNotice from "@/components/DemoNotice";
import AltitudeRibbon from "@/components/field/AltitudeRibbon";
import Tag from "@/components/field/Tag";
import MakerMark from "@/components/shop/MakerMark";
import MakerProductCard from "@/components/shop/MakerProductCard";
import { altitudeLabel } from "@/lib/field-guide";
import { PUBLIC_MAKER } from "@/lib/makers";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ slug: string }> | { slug: string } };

// A maker page exists only for a maker who is published AND has consented: the consent check is part of the lookup itself.
const find = (slug: string) => prisma.maker.findFirst({ where: { slug, ...PUBLIC_MAKER }, include: { experience: { select: { slug: true, name: true, status: true } }, products: { where: { status: "PUBLISHED" }, orderBy: [{ featured: "desc" }, { name: "asc" }] } } });

// `params` is read with `await` so this page is correct on today's Next.js and on the next one (where it becomes a promise).
export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  const { slug } = await params; const m = await find(slug);
  return m ? { title: `${m.name}, ${m.craft}`, description: m.story.slice(0, 160) } : {};
}

export const revalidate = 30;

export default async function MakerPage({ params }: Ctx) {
  const { slug } = await params; const m = await find(slug);
  if (!m) notFound();
  // The story is plain text: a blank line starts a new paragraph.
  const paras = m.story.replace(/\r\n?/g, "\n").split(/\n\s*\n/).map((t) => t.replace(/\s+/g, " ").trim()).filter(Boolean).map((text) => ({ text }));
  const card = { slug: m.slug, name: m.name, village: m.village, craft: m.craft, altitudeM: m.altitudeM };
  return (
    <div className="px-6 py-14 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <Link href="/shop" className="focus-ring font-body text-sm text-stone/70 hover:text-rust-deep">← Taita Made</Link>
        <div className="mt-8 flex flex-wrap items-center gap-6"><MakerMark name={m.name} size="lg" /><div><p className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-rust-deep">{m.isGroup ? "A group of makers" : "Maker"}</p><h1 className="mt-1 font-display text-[clamp(2.2rem,5vw,3.5rem)] font-medium leading-[1.05] tracking-tight text-stone">{m.name}</h1><p className="mt-1 font-body text-base text-stone/80">{m.craft} · {m.village}</p></div></div>

        <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="max-w-prose">
            {m.quote && <p className="font-display text-[1.6rem] leading-snug text-rust-deep">&ldquo;{m.quote}&rdquo;</p>}
            <div className={m.quote ? "mt-8" : ""}>{paras.map((b, i) => <p key={i} className={`font-body text-lg leading-relaxed text-stone/90 ${i > 0 ? "mt-5" : ""}`}>{b.text}</p>)}</div>
            {m.isDemo && <div className="mt-8"><DemoNotice>an invented sample maker: real makers appear only after they have agreed to be named.</DemoNotice></div>}
          </div>
          <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
            <section aria-labelledby="where-title" className="rounded-[2px] border border-stone/15 p-6">
              <p id="where-title" className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-rust-deep">Where they work</p>
              <p className="mt-3 font-display text-2xl text-stone">{m.village}</p>
              {m.altitudeM != null && <><div className="mt-3"><Tag>{altitudeLabel(m.altitudeM)}</Tag></div><div className="mt-3"><AltitudeRibbon altitudeM={m.altitudeM} /></div></>}
            </section>
            {m.experience?.status === "PUBLISHED" && (
              <section aria-labelledby="visit-title" className="rounded-[2px] border border-stone/15 p-6">
                <p id="visit-title" className="font-display text-xl leading-snug text-stone">Meet them in person</p>
                <Link href={`/experiences/listing/${m.experience.slug}`} className="focus-ring mt-3 inline-flex min-h-[44px] items-center font-body text-sm font-semibold text-rust-deep underline underline-offset-4">{m.experience.name}<span aria-hidden="true">&nbsp;→</span></Link>
              </section>
            )}
          </aside>
        </div>

        <section aria-labelledby="work-title" className="mt-16 border-t border-stone/10 pt-10">
          <h2 id="work-title" className="font-display text-3xl text-stone">{m.isGroup ? "Their work" : `${m.name.split(" ")[0]}'s work`}</h2>
          {m.products.length > 0 ? (
            <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-4">{m.products.map((p) => <MakerProductCard key={p.slug} product={p} maker={card} />)}</div>
          ) : <p className="mt-4 font-body text-stone/70">Nothing in the shop just now.</p>}
        </section>
      </div>
    </div>
  );
}
