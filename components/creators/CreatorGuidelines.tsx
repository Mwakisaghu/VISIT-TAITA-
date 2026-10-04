import { CREATOR_TERMS_VERSION } from "@/lib/creators";

// Plain-language DRAFT. Have a lawyer review the disclosure and licence wording before launch,
// and bump CREATOR_TERMS_VERSION in lib/creators.ts whenever this changes materially.
const RULES: { title: string; body: string }[] = [
  {
    title: "Show evidence, not adjectives",
    body: "Tell people what they can't see from a photo: what it costs, how long it takes, how to get there, who it suits — and one honest caveat. Please don't call anything \"perfect\" or \"unmissable\" without showing why.",
  },
  {
    title: "Be there",
    body: "Only write about places you have actually been. For missions, Visit Taita ties each Field Note to a verified check-in at the place.",
  },
  {
    title: "Always disclose",
    body: "If you were hosted, paid, gifted or sponsored — including free stays, meals or products — say so clearly in the post itself (for example \"#ad\" or \"Hosted by …\"), not just in your bio. We'll give you the exact line for hosted missions.",
  },
  {
    title: "Respect people and places",
    body: "Ask before photographing or filming people, follow each site's rules, and never put yourself or others at risk for a shot.",
  },
  {
    title: "Your work stays yours",
    body: "You keep ownership of what you make. When you submit content to Visit Taita, you give us a non-exclusive licence to show it on VisitTaita and our channels, with credit to you. You can ask us to remove it.",
  },
  {
    title: "Keep it truthful",
    body: "No invented claims, no fake reviews, no copied material. We may remove content or pause a profile that breaks these guidelines.",
  },
];

export default function CreatorGuidelines() {
  return (
    <div className="rounded-sm border border-stone/10 p-5 sm:p-6">
      <p className="font-display text-xl text-stone">Creator guidelines</p>
      <ol className="mt-4 flex flex-col gap-4">
        {RULES.map((r, i) => (
          <li key={r.title} className="flex gap-3">
            <span className="font-body text-xs text-rust">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <p className="font-body text-sm font-semibold text-stone">{r.title}</p>
              <p className="mt-1 font-body text-sm leading-relaxed text-stone/70">{r.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-5 font-body text-xs text-stone/40">Guidelines version {CREATOR_TERMS_VERSION}</p>
    </div>
  );
}
