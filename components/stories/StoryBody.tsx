import type { Block } from "@/lib/stories-view";

/** The story text: a larger opening paragraph, then ordinary paragraphs, with pull quotes in display type. Plain text only — nothing is treated as HTML. */
export default function StoryBody({ blocks }: { blocks: Block[] }) {
  let firstPara = true;
  return (
    <div className="font-body">
      {blocks.map((b, i) => {
        if (b.type === "quote") return (
          <figure key={i} className="my-12">
            <blockquote className="font-display text-[clamp(1.408rem,2.992vw,1.936rem)] leading-[1.2] text-rust-deep">&ldquo;{b.text}&rdquo;</blockquote>
            {b.cite && <figcaption className="mt-3 font-body text-sm font-semibold uppercase tracking-[0.14em] text-stone/70">&mdash; {b.cite}</figcaption>}
          </figure>
        );
        const lead = firstPara; firstPara = false;
        return <p key={i} className={`whitespace-pre-line text-stone/90 ${lead ? "text-xl leading-relaxed" : "mt-6 text-lg leading-relaxed"}`}>{b.text}</p>;
      })}
    </div>
  );
}
