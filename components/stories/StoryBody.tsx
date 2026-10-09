import type { Block } from "@/lib/stories-view";

/** The story text: a larger opening paragraph, then ordinary paragraphs, with pull quotes in display type. Plain text only — nothing is treated as HTML. */
export default function StoryBody({ blocks }: { blocks: Block[] }) {
  let firstPara = true;
  return (
    <div className="font-body">
      {blocks.map((b, i) => {
        if (b.type === "quote") return <blockquote key={i} className="my-12 font-display text-[clamp(1.6rem,3.4vw,2.2rem)] leading-[1.2] text-rust-deep">&ldquo;{b.text}&rdquo;</blockquote>;
        const lead = firstPara; firstPara = false;
        return <p key={i} className={`whitespace-pre-line text-stone/90 ${lead ? "text-xl leading-relaxed" : "mt-6 text-lg leading-relaxed"}`}>{b.text}</p>;
      })}
    </div>
  );
}
