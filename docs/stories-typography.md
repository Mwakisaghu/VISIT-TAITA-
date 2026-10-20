# Story pages: type and spacing

The hub, the covers, the cards and the article all take their type from **one file**, `components/stories/type.ts`. No story page sets its own size.

**Serif for the story, sans for the interface.**
- Serif (Fraunces): the headlines, the standfirst under an article's headline, and pull quotes.
- Sans (Manrope): labels, descriptions, small facts (reading time, place, byline), the quote attribution, the article text and the links.

**The set** (all defined once, in `type.ts`):
| name | what it is for |
| --- | --- |
| `kicker` | a small label in tracked capitals: a story's category, a section's name. Identical to the home page's labels |
| `headline.page` / `feature` / `card` / `small` | the four serif headline sizes: the page's h1, the large featured cover, a cover or card, a side panel or short list |
| `standfirst` | the one-sentence promise under an article's headline |
| `pullquote`, `cite` | a quote in the text, and who it is by |
| `blurb` | a description on a cover, card or panel |
| `meta` | small facts |
| `prose`, `lead` | the article text, and its (slightly larger) opening paragraph |
| `measure` | the line length (about 65 characters) that all reading text uses |
| `action` | a link that goes somewhere: identical to the home page's links, and finger-sized |

A cover and a card always tell a story in the same order: **label, headline, description, small facts.**

**To change a size:** change it in `type.ts` and it changes everywhere. **Do not** write a font size, a letter-spacing or a typeface into a story page: `tests/stories_type_test.tsx` fails if you do. To add a new look, add it to `type.ts` with a name and a comment.

Colours are not part of the tokens (a cover is light on dark and a card dark on light), so each place adds its own.
