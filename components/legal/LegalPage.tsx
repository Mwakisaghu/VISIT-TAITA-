import Link from "next/link";
import type { LegalSection } from "@/lib/legal-text";
import { LEGAL_VERSION, formatLegalDate, type SiteInfo } from "@/lib/site-info";

/**
 * Renders [text](/internal/path) links and **bold**. Only internal links (one leading slash — not "//host") are ever turned
 * into links, so legal text can never smuggle in an external or script URL.
 */
export function renderInline(text: string): React.ReactNode[] {
  // A link must start with ONE slash followed by a non-slash: "//host" is a protocol-relative (external) URL and a
  // backslash is read as a slash by browsers, so neither is ever accepted.
  const parts = text.split(/(\[[^\]]+\]\(\/(?![/\\])[^)\s\\]*\)|\*\*[^*]+\*\*)/g).filter((p) => p !== "");
  return parts.map((p, i) => {
    const link = /^\[([^\]]+)\]\((\/(?![/\\])[^)\s\\]*)\)$/.exec(p);
    if (link) {
      return (
        <Link key={i} href={link[2]} className="underline hover:text-rust">
          {link[1]}
        </Link>
      );
    }
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
    return p;
  });
}

export default function LegalPage({
  title,
  intro,
  sections,
  info,
}: {
  title: string;
  intro?: string;
  sections: LegalSection[];
  info: SiteInfo;
}) {
  return (
    <div className="px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <p className="font-body text-sm text-rust">Visit Taita</p>
        <h1 className="mt-1 font-display text-4xl text-stone sm:text-5xl">{title}</h1>
        <p className="mt-3 font-body text-sm text-stone/50">
          Version {LEGAL_VERSION}
          {info.reviewedOn ? ` · Legally reviewed ${formatLegalDate(info.reviewedOn)}` : ""}
        </p>

        {!info.reviewedOn && (
          <div role="note" className="mt-6 rounded-sm border border-ochre/60 bg-ochre/10 p-4">
            <p className="font-body text-sm font-semibold text-stone">Draft — pending legal review</p>
            <p className="mt-1 font-body text-sm text-stone/80">
              This text is a plain-language draft that has not yet been reviewed by a lawyer. It may change before launch.
            </p>
          </div>
        )}

        {intro && <p className="mt-8 max-w-prose font-body text-lg leading-relaxed text-stone/80">{intro}</p>}

        <nav aria-label="On this page" className="mt-8 rounded-sm border border-stone/10 p-4">
          <p className="font-body text-xs text-stone/50">On this page</p>
          <ol className="mt-2 grid gap-1 sm:grid-cols-2">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="font-body text-sm text-stone/80 hover:text-rust">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 flex flex-col gap-10">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="font-display text-2xl text-stone">{s.title}</h2>
              <div className="mt-3 flex max-w-prose flex-col gap-3">
                {s.body.map((block, i) =>
                  typeof block === "string" ? (
                    <p key={i} className="font-body leading-relaxed text-stone/80">
                      {renderInline(block)}
                    </p>
                  ) : (
                    <ul key={i} className="flex list-disc flex-col gap-2 pl-5">
                      {block.list.map((item, j) => (
                        <li key={j} className="font-body leading-relaxed text-stone/80">
                          {renderInline(item)}
                        </li>
                      ))}
                    </ul>
                  )
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
