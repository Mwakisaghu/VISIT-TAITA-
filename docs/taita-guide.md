# Taita Guide

A helpful, rare, easy-to-close prompt that offers visitors a way forward: a day planned by altitude, this month's maker, a surprise place, or (optionally) an AI guide. It is the small round button at the bottom left of every ordinary page, and it also appears once, politely, when someone seems about to leave.

## When it appears on its own
Never in the first 10 seconds. Only after the visitor is engaged: two pages seen, or 45 seconds on the site with a third of a page scrolled. Then, **once per visit**:

- **Laptop or desktop:** when the pointer leaves through the top of the window (heading for the tabs or the back button).
- **Phone:** after a quick scroll back up from deep in a page, or after 45 quiet seconds. A bottom sheet, never a full screen.

After it is closed, it stays quiet for **7 days**. After someone uses it, **30 days**. After "Don't show this again", **a year**. At most **3 times in 30 days**. It never appears on the planner, cart, checkout, passport, sign-in, account, admin, partner, privacy or terms pages.

The small button is always there (on the pages above, too, except the excluded ones) and opens the guide when someone asks for it; asking for it never counts as an interruption.

## The four offers
| Offer | Starts here | What it does |
|---|---|---|
| Plan my day | Home, stays, experiences, events, other pages | Pick an altitude (Highlands, Foothills, Plains), a day and a group size. It lines up a day from what is really on, using the planner's own overlap and drive-time rules, and opens it in the planner ready to edit. **Nothing is booked.** On a story about a place, it builds the day around that place. |
| Meet a maker | Shop | This month's maker and one piece. Only a published maker who has given consent. |
| Surprise me | Map, Discover | A random place, or the map. |
| Ask Taita | Stories (when switched on) | An AI guide that answers only from this site's own published pages. |

## Turning things on and off
All settings go in the hosting environment (Netlify: Site configuration > Environment variables), then redeploy.

| Setting | Effect |
|---|---|
| `NEXT_PUBLIC_CONCIERGE_OFF=1` | Switches the whole guide off. |
| `ANTHROPIC_API_KEY` | Switches on **Ask Taita**. Without it the guide works fully, minus the AI tab. |
| `CONCIERGE_MODEL` | Optional. Which model answers. Default: `claude-haiku-5-5` (fast and inexpensive). |
| `CONCIERGE_DAILY_LIMIT` | Optional. Most AI answers per day for the whole site. Default 300, at most 5,000. |

## How the AI stays honest
- It is given **only** your published places, stories, experiences, stays, upcoming events and makers who have consented. It is told to answer only from those, never invent prices, dates or links, never claim to book anything, and to say so when it doesn't know.
- What a visitor types is treated as untrusted text: it cannot change those instructions, and a "system" message sent from the browser is refused.
- Links in an answer are matched against your real pages by name, so every link goes somewhere real.
- The chat box says plainly that it is an AI, can be wrong, and that visitors shouldn't share personal information.
- **Nothing a visitor types is stored or logged by this site.**

## Cost and limits
Each person is limited to 6 questions a minute and 40 an hour, and the whole site to `CONCIERGE_DAILY_LIMIT` a day. These counters live in the memory of one server, so on serverless hosting they are a brake, not a guarantee. **Also set a monthly spending limit with your AI provider.** Answers are capped at about 350 tokens.

## Privacy: please update your privacy page
*(The wording below is now part of the privacy policy, version 2026-10.2 and later, and a test keeps it true. A lawyer should still read it.)*

The guide stores a small note in the visitor's own browser (when it was last shown or dismissed). That holds no personal details. Ask Taita sends the visitor's question, and your published listing text, to your AI provider to produce an answer. Suggested wording for the privacy page, to be checked against your own legal advice and Kenya's Data Protection Act:

> "Our optional Ask Taita guide uses an AI service provided by Anthropic. When you ask a question, the text of your question and recent messages in that conversation are sent to Anthropic to generate an answer. We do not store your questions or the answers. Please do not include personal information in your questions."

## Changing the wording or the rules
All the timing numbers are in `lib/concierge.ts` (`RULES`), and the offers' wording in `COPY` there. They are covered by tests, so a change that makes it pushier than intended will fail.
