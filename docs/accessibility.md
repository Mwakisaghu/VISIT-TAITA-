# Accessibility: what is checked automatically, and what a person must check

People using a screen reader (TalkBack on a phone is the common one), a keyboard, a magnified screen, or a phone in bright sunlight all use this site. This page says what the code checks for you and what only a person can.

## Checked automatically (every test run)
`node scripts/a11y-scan.mjs` reads every page and component (using the TypeScript compiler already in the project) and the test `tests/a11y_scan_test.tsx` fails if it finds a problem. It checks:
- a **picture with no `alt`**, and a link whose only content is a picture with an empty `alt` (the link would have no name);
- a **button or link with no name** (no text, `aria-label`, or labelled picture);
- a **form field with no label** (wrap it in a `<label>`, or give it an `id` with a matching `htmlFor`, or an `aria-label`: a placeholder is **not** a label, it vanishes as soon as you type);
- a **clickable `div`** a keyboard cannot reach (use a `<button>`), a positive `tabIndex`, a new-window link without `rel="noopener noreferrer"`, an `outline-none` that nothing replaces (use the `focus-ring` class), an `<iframe>` without a title, a focusable item hidden from screen readers, an empty heading;
- **colour contrast** of text against its background, using the colours in `tailwind.config.ts` (4.5 to 1, or 3 to 1 for large text), wherever the background can be known from the code. It deliberately stands down when a **photograph, a gradient or a computed style** is behind the text (it cannot know the real colour there), and does not judge the staff admin.
- `tests/a11y_scan_test.tsx` also checks that **every public page has a top-level heading** (the shared `SectionHeading` is an `h2` unless you pass `as="h1"`), that the **skip link** still works, and that the guide's contrast table below is true.

## Colours (against the page background `#ECE3CD`)
Use these for small text. A test recomputes every number.

| Text colour | Contrast | Use |
| --- | --- | --- |
| `text-stone` | 13.8 | everything |
| `text-rust-deep` | 7.0 | small rust-coloured text (warnings, links) |
| `text-canopy` | 8.0 | green text |
| `text-rust` | 4.8 | fine for body text on the plain page background, but **not on a tinted panel**: use `text-rust-deep` there |
| `text-ochre` | 2.0 | **never** for text on a light background; on the dark green use `text-ochre-light` |
| `text-stone` at 60 percent or less | 4.3 and below | do not use; at 70 percent it is 5.8 |

## Only a person can check (the launch checklist has these)
1. **Keyboard only** (put the mouse away): tab through the home page, a listing, an enquiry form, checkout and sign-in. You must always see where you are, never get stuck, and be able to close anything that opens with Esc or a Close button.
2. **A screen reader** (TalkBack on Android, or NVDA on Windows, both free): the home page, an enquiry form and a booking. Headings should read in order, every field should be announced with its name, and buttons with what they do.
3. **Zoom to 200 percent** and raise the phone's text size: nothing cut off, nothing overlapping.
4. **Text over photographs.** The scanner cannot judge it: look at every hero and card in bright light, at full brightness.
5. **Reduced motion:** turn it on in the phone or computer settings; the big animations should stop.
6. **Real pictures:** when real photos go in, each one that carries meaning needs an `alt` that describes it; a purely decorative one uses `alt=""`.

## Not covered
Whether an `alt` text is a *good* description; the order things are read in a complicated page; captions or transcripts for any video; the colours inside the staff admin; documents the visitor downloads (the ticket PDF).
