// The type and spacing of every story page, defined ONCE so that the hub, the covers, the cards and the article read as one magazine.
//   * SERIF (font-display, Fraunces) is for the STORY: headlines, the standfirst, pull quotes.
//   * SANS (font-body, Manrope) is for the INTERFACE: labels, descriptions, metadata, links and buttons.
// A small, fixed set of sizes: no story surface sets its own. Colours are NOT in these tokens (a cover is light on dark, a card dark on light): each place adds its own colour.
// The story pages are guarded by tests/stories_type_test.tsx: add a size HERE, never inline.

/** A small label in tracked capitals: a story's category, a section's name. The same as the home page's labels, so the whole site speaks with one voice. */
export const kicker = "font-body text-[0.7rem] font-semibold uppercase tracking-[0.28em]";
/** Serif headlines, four sizes and no more. Every reading token can break a very long word (a place name, a web address) instead of widening the page on a phone. */
export const headline = {
  page: "font-display break-words text-[clamp(2rem,4.6vw,3.25rem)] font-medium leading-[1.06] tracking-tight", // the h1 of the hub and of an article
  feature: "font-display break-words text-[clamp(1.75rem,3.6vw,2.6rem)] font-medium leading-[1.1] tracking-tight", // the large, featured cover
  card: "font-display break-words text-[1.625rem] font-medium leading-[1.15] tracking-tight", // a story cover or card
  small: "font-display break-words text-[1.25rem] font-medium leading-[1.25] tracking-tight", // a side panel, a short list, an empty state
} as const;
/** The article's standfirst: the one-sentence promise under the headline. */
export const standfirst = "break-words font-display text-[1.375rem] leading-[1.4]";
/** A pull quote in the text. */
export const pullquote = "break-words font-display text-[clamp(1.5rem,2.6vw,1.95rem)] leading-[1.25]";
/** A description on a cover, card or panel. */
export const blurb = "break-words font-body text-[0.95rem] leading-relaxed";
/** Small facts: reading time, place, byline, a region. */
export const meta = "font-body text-[0.8rem] leading-snug tracking-[0.03em]";
/** Who a pull quote is by. */
export const cite = "font-body text-[0.8rem] font-semibold uppercase leading-snug tracking-[0.14em]";
/** The article text: comfortable size and line height; the opening paragraph is a little larger. */
export const prose = "break-words font-body text-[1.0625rem] leading-[1.75]";
export const lead = "break-words font-body text-[1.1875rem] leading-[1.7]";
/** A comfortable line length (about 65 characters): every block of reading text uses it. */
export const measure = "max-w-[65ch]";
/** A link that takes you somewhere: the same as the home page's links, and a finger-sized target. */
export const action = "focus-ring inline-flex min-h-[44px] items-center gap-2 font-body text-[0.72rem] font-semibold uppercase tracking-[0.2em] underline decoration-1 underline-offset-[6px] transition-colors";
/** Vertical rhythm: a few steps, reused. */
export const space = { section: "py-16 sm:py-20", block: "mt-14", stack: "mt-6", tight: "mt-3" } as const;
