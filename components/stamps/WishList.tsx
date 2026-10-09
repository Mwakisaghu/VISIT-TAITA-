import Link from "next/link";
import Tag from "@/components/field/Tag";
import { toggleWish } from "@/lib/actions/stamps";
import { altitudeLabel } from "@/lib/field-guide";

export type Wish = { id: string; name: string; slug: string; region: string; altitudeM: number | null };

/** The places a person has saved to visit, newest first, each with a way to see it on the map and a way to take it off the list. */
export default function WishList({ wishes }: { wishes: Wish[] }) {
  return (
    <section aria-labelledby="wish-title" className="mt-16">
      <h2 id="wish-title" className="font-display text-3xl text-stone">Want to go</h2>
      <p className="mt-2 max-w-xl font-body text-sm text-stone/80">Places you have saved. Find more on the map and tap &ldquo;Want to go&rdquo;.</p>
      {wishes.length > 0 ? (
        <ul className="mt-6 divide-y divide-stone/10 border-y border-stone/10">
          {wishes.map((w) => (
            <li key={w.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div>
                <p className="font-display text-lg text-stone">{w.name}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 font-body text-sm text-stone/80">{w.region}{w.altitudeM != null && <Tag>{altitudeLabel(w.altitudeM)}</Tag>}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/map?place=${w.slug}`} className="focus-ring inline-flex min-h-[44px] items-center font-body text-sm font-semibold text-rust-deep underline underline-offset-4">Show on the map<span className="sr-only"> : {w.name}</span></Link>
                <form action={async () => { "use server"; await toggleWish(w.id); }}>
                  <button type="submit" className="focus-ring inline-flex min-h-[44px] items-center rounded-full border border-stone/30 px-4 font-body text-sm text-stone hover:border-stone">Remove<span className="sr-only"> {w.name} from your list</span></button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 rounded-sm border border-stone/15 p-6 font-body text-sm text-stone/80">Nothing saved yet. <Link href="/map" className="focus-ring font-semibold text-rust-deep underline underline-offset-4">Open the map</Link> to find somewhere.</p>
      )}
    </section>
  );
}
