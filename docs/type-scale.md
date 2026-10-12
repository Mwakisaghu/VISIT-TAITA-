# Type scale (headings)

Headings and the phone menu were too large, so they were scaled down once, consistently. Reading text (16–18 px paragraphs) was not changed.

| What | Before | After |
|---|---|---|
| Fluid headings, `text-[clamp(min, vw, max)]` | max 3 rem and up | scaled by 0.8 (3–4 rem), 0.74 (4–6 rem), 0.72 (6–8 rem), 0.6 (8 rem and up); under 3 rem by 0.88 |
| Fixed Tailwind sizes | 4xl, 5xl, 6xl, 7xl | 3xl, 4xl, 5xl, 5xl |
| Fixed arbitrary sizes of 3 rem and up | e.g. `text-[6rem]` | multiplied by 0.7 |
| Phone menu links | 36 px | 24 px |
| Discover chapter numbers, event date numerals | 96 px / 72 px | 48 px / 36 px on a phone, 67 px / 48 px from the sm breakpoint up |

This file also marks the change as done, so the script does not scale things a second time. To adjust a size later, edit it directly where it is used.
