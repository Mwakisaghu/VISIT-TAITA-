import Link from "next/link";
import ShortLinkForm from "@/components/admin/ShortLinkForm";
import StarterLinksButton from "@/components/admin/StarterLinksButton";
import { DEFAULT_LINKS, qrReadiness } from "@/lib/go";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

export default async function QrLinksPage() {
  const links = await prisma.shortLink.findMany({ orderBy: [{ active: "desc" }, { slug: "asc" }] });
  const since = new Date(Date.now() - 30 * DAY);
  const days = await prisma.shortLinkDay.findMany({ where: { day: { gte: since } }, select: { linkId: true, day: true, count: true } });
  const sum = (id: string, from: number) => days.filter((d) => d.linkId === id && d.day.getTime() >= Date.now() - from * DAY).reduce((n, d) => n + d.count, 0);
  const ready = qrReadiness(getSiteUrl());
  const missing = DEFAULT_LINKS.filter((d) => !links.some((l) => l.slug === d.slug));

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">QR links</h1>
      <p className="mt-2 max-w-2xl font-body text-sm text-stone/60">
        A printed QR code points at a short, permanent address on your own site (like <code>/go/hills</code>), which then forwards to a page.
        You can change where it forwards <strong>at any time without reprinting</strong>, and see how many people scanned it. A link can be switched off but
        never deleted or renamed, because printed copies exist.
      </p>

      {!ready.ok && (
        <p role="alert" className="mt-6 max-w-2xl rounded-sm border border-rust/40 bg-rust/10 p-4 font-body text-sm text-stone">
          <strong>Don&apos;t print yet.</strong> {ready.reason} The links below work now; QR codes can&apos;t be downloaded until this is fixed.
        </p>
      )}

      {missing.length > 0 && (
        <div className="mt-6 max-w-2xl rounded-sm border border-ochre/50 bg-ochre/10 p-4">
          <p className="font-body text-sm text-stone">{missing.length} built-in link{missing.length === 1 ? " isn't" : "s aren't"} in your list yet ({missing.map((m) => `/go/${m.slug}`).join(", ")}). They already work; add them to count scans and edit them.</p>
          <div className="mt-3"><StarterLinksButton /></div>
        </div>
      )}

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left font-body text-sm">
          <thead className="text-xs text-stone/50"><tr><th className="py-2 pr-4">Link</th><th className="pr-4">Goes to</th><th className="pr-4">Scans</th><th className="pr-4">7 days</th><th className="pr-4">30 days</th><th /></tr></thead>
          <tbody className="divide-y divide-stone/10">
            {links.map((l) => (
              <tr key={l.id} className={l.active ? "" : "opacity-60"}>
                <td className="py-3 pr-4"><p className="text-stone">{l.label}</p><p className="text-xs text-stone/50">/go/{l.slug}{l.active ? "" : " · switched off"}</p></td>
                <td className="pr-4 text-stone/70">{l.target}</td>
                <td className="pr-4">{l.clicks}</td>
                <td className="pr-4">{sum(l.id, 7)}</td>
                <td className="pr-4">{sum(l.id, 30)}</td>
                <td><Link href={`/admin/qr/${l.id}`} className="text-rust underline">QR &amp; edit</Link></td>
              </tr>
            ))}
            {links.length === 0 && <tr><td colSpan={6} className="py-6 text-stone/50">No links yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <h2 className="mt-12 font-display text-xl text-stone">New link</h2>
      <div className="mt-4"><ShortLinkForm /></div>
    </div>
  );
}
