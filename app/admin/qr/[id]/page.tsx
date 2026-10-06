import Link from "next/link";
import { notFound } from "next/navigation";
import ShortLinkForm from "@/components/admin/ShortLinkForm";
import { eatDay, qrReadiness, shortUrl } from "@/lib/go";
import { prisma } from "@/lib/prisma";
import { printGuide, qrModules, qrSvg } from "@/lib/qr-code";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function QrLinkPage({ params }: { params: { id: string } }) {
  const link = await prisma.shortLink.findUnique({ where: { id: params.id } });
  if (!link) notFound();
  const days = await prisma.shortLinkDay.findMany({ where: { linkId: link.id }, orderBy: { day: "desc" }, take: 30, select: { day: true, count: true } });

  const ready = qrReadiness(getSiteUrl());
  const url = ready.ok ? shortUrl(ready.base, link.slug) : null;
  const svg = url ? await qrSvg(url) : null;
  const guide = url ? printGuide(qrModules(url)) : null;
  const dl = `/admin/qr/${link.id}/file`;
  const today = eatDay(new Date()).getTime();

  return (
    <div>
      <Link href="/admin/qr" className="font-body text-sm text-stone/60 hover:text-rust">← All QR links</Link>
      <h1 className="mt-3 font-display text-3xl text-stone">{link.label}</h1>
      <p className="mt-1 font-body text-sm text-stone/60">/go/{link.slug} → {link.target} · {link.clicks} scan{link.clicks === 1 ? "" : "s"}</p>

      {!link.active && <p className="mt-4 max-w-xl rounded-sm border border-ochre/50 bg-ochre/10 p-4 font-body text-sm text-stone">This link is <strong>switched off</strong>: anyone scanning a printed code is sent to the home page.</p>}

      {!ready.ok && (
        <p role="alert" className="mt-6 max-w-xl rounded-sm border border-rust/40 bg-rust/10 p-4 font-body text-sm text-stone">
          <strong>Don&apos;t print yet.</strong> {ready.reason}
        </p>
      )}

      {svg && guide && url && (
        <section className="mt-8 grid gap-8 md:grid-cols-[18rem_1fr]">
          <div>
            <div className="w-full max-w-[18rem] rounded-sm border border-stone/15 bg-white p-2 [&>svg]:h-full [&>svg]:w-full" role="img" aria-label={`QR code for ${url}`} dangerouslySetInnerHTML={{ __html: svg }} />
            <p className="mt-2 break-all font-body text-xs text-stone/50">Encodes: {url}</p>
          </div>
          <div className="font-body text-sm text-stone/80">
            <h2 className="font-display text-xl text-stone">Download</h2>
            <p className="mt-2 flex flex-wrap gap-3">
              <a href={`${dl}?format=svg`} className="focus-ring rounded-full bg-rust px-5 py-2 text-parchment hover:bg-rust-deep">Vector (SVG) — for the printer</a>
              <a href={`${dl}?format=png&size=2000`} className="focus-ring rounded-full border border-stone/20 px-5 py-2 hover:border-rust hover:text-rust">PNG 2000 px</a>
              <a href={`${dl}?format=png&size=4000`} className="focus-ring rounded-full border border-stone/20 px-5 py-2 hover:border-rust hover:text-rust">PNG 4000 px</a>
            </p>
            <h2 className="mt-8 font-display text-xl text-stone">Printing it so it scans</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>This code is {guide.modules}×{guide.modules} squares (short addresses make big, easy squares). <strong>Print it at least {guide.recommendedMm / 10} cm wide</strong> including its white border; never below {guide.minimumMm / 10} cm.</li>
              <li>At 8 cm wide each square is {guide.squareMmAt(80)} mm — comfortably readable.</li>
              <li><strong>Black on white only.</strong> Keep the white border (4 squares) — on a dark shirt, print a white patch behind the code. Don&apos;t invert, recolour, stretch, or put a logo over it.</li>
              <li>Put it where it stays flat: avoid seams, collars and folds. Choose a print method that keeps sharp edges (screen print or DTF; embroidery is not suitable).</li>
              <li><strong>Test a real printed sample</strong> on two or three different phones, indoors and outdoors, before ordering a batch.</li>
            </ul>
          </div>
        </section>
      )}

      <h2 className="mt-12 font-display text-xl text-stone">Change this link</h2>
      <p className="mt-1 max-w-xl font-body text-sm text-stone/60">Changing where it goes takes effect immediately for every code already printed. The short address itself can&apos;t be changed.</p>
      <div className="mt-4"><ShortLinkForm link={{ id: link.id, slug: link.slug, label: link.label, target: link.target, active: link.active }} /></div>

      <h2 className="mt-12 font-display text-xl text-stone">Scans, last 30 days</h2>
      <p className="mt-1 font-body text-xs text-stone/50">Counted per day (East Africa Time). No one&apos;s address or device is recorded, and link-preview robots aren&apos;t counted.</p>
      <table className="mt-3 w-full max-w-sm text-left font-body text-sm">
        <tbody className="divide-y divide-stone/10">
          {days.map((d) => <tr key={d.day.toISOString()}><td className="py-2">{d.day.toISOString().slice(0, 10)}{d.day.getTime() === today ? " (today)" : ""}</td><td>{d.count}</td></tr>)}
          {days.length === 0 && <tr><td className="py-3 text-stone/50">No scans yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
