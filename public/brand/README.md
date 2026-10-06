# Visit Taita brand kit

Reconstructed from the white-shirt mockups (the lettering rebuilt as exact geometry; the S, ridge and acacia traced). When the
official vector logo is available, replace these files and `lib/brand-paths.ts`.

| File | Use |
|---|---|
| `visit-taita-logo-navy.svg` / `.png` | Full logo on light backgrounds (PNG is transparent, 2400 px wide) |
| `visit-taita-logo-white.svg` / `.png` | Full logo on dark or photographic backgrounds |
| `visit-taita-logo-black.svg` | One-colour printing |
| `visit-taita-mark-navy.svg` / `-white.svg` | The ridge and acacia alone |
| `visit-taita-logo-square.png` | 1024 px square on white (directories, structured data) |
| `social-profile.png` | 1080 px profile picture for Instagram and WhatsApp (lockup stays inside the circle crop) |
| `og-default.png` | 1200×630 link-preview image (WhatsApp, Instagram, Facebook, X) |

**Colour:** navy `#1B2C4C`, white `#FFFFFF`, black `#000000`.
**Clear space:** keep at least the height of the "V" of VISIT free on every side. **Minimum size:** 90 px wide on screen.
**Tagline:** "More than a place." (always with the full stop).
In code use `<Logo />` (`components/brand/Logo.tsx`), which takes its colour from the text colour.
