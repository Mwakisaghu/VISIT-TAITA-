# Open-source licences: what was checked

Checked in October 2026 from the packages the site ships to visitors. This is a summary, not legal advice.

| Package | Licence | What to know |
|---|---|---|
| Most packages (React, Next.js, Prisma, Tailwind, zod and others) | MIT, ISC, BSD, Apache-2.0 | Permissive. Keep their licence notices when you redistribute. |
| Fonts (Fraunces, Manrope) | SIL Open Font License | Free to use, including commercially. Do not sell the fonts on their own. |
| Leaflet (the map engine) | BSD-2-Clause | Permissive. |
| ~~react-leaflet~~ (removed) | Hippocratic License 2.1 | **Removed.** The site now uses Leaflet directly through its own small wrapper, so this licence no longer applies (see below). |
| caniuse-lite | CC-BY-4.0 | Browser-support data used while building. Attribution is required if you redistribute it; a notice in your licence file covers it. |
| sharp (picture processing) | Apache-2.0, with LGPL-3.0 components in its bundled image library | Normal. Used as a separate library, not modified. Keep the notice. |

## The map library (resolved)
The site used `react-leaflet`, whose Hippocratic License 2.1 is unusual (it adds conditions about human-rights standards) and which also stopped working with React 19. It was replaced by Leaflet (BSD-2-Clause) used directly, through a wrapper of about 50 lines in `components/map/LeafletMap.tsx`. Nothing else in the licence table changed. A test fails if `react-leaflet` is added back, so the question cannot quietly return.

## Keeping a record
Before launch, generate a notices file from your own install (for example with the `license-checker` package) and keep it in the repository. Re-check when you add a new package.
