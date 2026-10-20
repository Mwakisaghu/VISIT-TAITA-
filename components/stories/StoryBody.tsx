import { cite, lead, measure, prose, pullquote } from "@/components/stories/type";
import type { Block } from "@/lib/stories-view";

/** The story text: a larger opening paragraph, then ordinary paragraphs, with pull quotes in serif type set off by an ochre rule. Plain text only: nothing is treated as HTML. */
export default function StoryBody({ blocks }: { blocks: Block[] }) {
  let firstPara = true;
  return (
    <div className={measure}>
      {blocks.map((b, i) => {
        if (b.type === "quote") return (
          <figure key={i} className="my-14 border-l-2 border-ochre pl-6">
            <blockquote className={`${pullquote} text-rust-deep`}>&ldquo;{b.text}&rdquo;</blockquote>
            {b.cite && <figcaption className={`${cite} mt-3 text-stone/80`}>&mdash; {b.cite}</figcaption>}
          </figure>
        );
        const isLead = firstPara; firstPara = false;
        return <p key={i} className={`whitespace-pre-line text-stone/90 ${isLead ? lead : `${prose} mt-6`}`}>{b.text}</p>;
      })}
    </div>
  );
}
