# Open-source licences: what was checked

Checked in October 2026 from the packages the site ships to visitors. This is a summary, not legal advice.

| Package | Licence | What to know |
|---|---|---|
| Most packages (React, Next.js, Prisma, Tailwind, zod and others) | MIT, ISC, BSD, Apache-2.0 | Permissive. Keep their licence notices when you redistribute. |
| Fonts (Fraunces, Manrope) | SIL Open Font License | Free to use, including commercially. Do not sell the fonts on their own. |
| Leaflet (the map engine) | BSD-2-Clause | Permissive. |
| **react-leaflet** and **@react-leaflet/core** | **Hippocratic License 2.1** | **Needs a decision (below).** |
| caniuse-lite | CC-BY-4.0 | Browser-support data used while building. Attribution is required if you redistribute it; a notice in your licence file covers it. |
| sharp (picture processing) | Apache-2.0, with LGPL-3.0 components in its bundled image library | Normal. Used as a separate library, not modified. Keep the notice. |

## The decision: react-leaflet
The Hippocratic License is not a standard open-source licence: it allows use but adds conditions about human-rights standards. A Kenyan tourism site is very unlikely to be affected, but it is unusual enough that you should have a lawyer confirm it. Two options:
1. **Keep it,** with a lawyer's confirmation.
2. **Replace it** with Leaflet used directly (Leaflet is BSD). Only two files use it (`components/map/ExploreMap.tsx` and `components/map/DestinationMap.tsx`, about 300 lines, using MapContainer, TileLayer, Marker, Popup and useMap). It is a contained job, but it touches the map's popups and filters, so it needs its own testing.

## Keeping a record
Before launch, generate a notices file from your own install (for example with the `license-checker` package) and keep it in the repository. Re-check when you add a new package.
