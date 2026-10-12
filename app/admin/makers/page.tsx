import Link from "next/link";
import { deleteMaker } from "@/lib/actions/makers";
import { prisma } from "@/lib/prisma";

export default async function AdminMakersPage() {
  const makers = await prisma.maker.findMany({ orderBy: { updatedAt: "desc" }, include: { _count: { select: { products: true } } } });
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-stone">Makers</h1>
        <Link href="/admin/makers/new" className="focus-ring rounded-full bg-rust px-5 py-2 font-body text-sm text-parchment hover:bg-rust-deep">New maker</Link>
      </div>
      <p className="mt-3 max-w-xl font-body text-sm text-stone/70">The people and groups behind what is sold. A maker is shown publicly only when it is published <em>and</em> their consent is recorded.</p>
      <div className="mt-8 divide-y divide-stone/10">
        {makers.length === 0 && <p className="py-4 font-body text-sm text-stone/70">No makers yet.</p>}
        {makers.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div>
              <p className="font-body text-xs text-stone/70">{m.isGroup ? "Group" : "Person"} · {m.status}{m.isDemo && " · demo"} · {m._count.products} product{m._count.products === 1 ? "" : "s"} · {m.consentGivenAt ? "Consent recorded" : "NO CONSENT: hidden"}</p>
              <p className="font-display text-lg text-stone">{m.name}</p>
              <p className="font-body text-sm text-stone/70">{m.craft} · {m.village}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href={`/admin/makers/${m.id}`} className="focus-ring font-body text-sm text-stone underline underline-offset-4">Edit<span className="sr-only"> {m.name}</span></Link>
              <form action={async () => { "use server"; await deleteMaker(m.id); }}><button type="submit" className="focus-ring font-body text-sm text-rust-deep underline underline-offset-4">Delete<span className="sr-only"> {m.name}</span></button></form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
