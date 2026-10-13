# Photographs: what the site accepts, and how to get real ones

Visit Taita says "real people, real places". Pictures are where that promise is kept or broken. A stock sunrise labelled as the Taita Hills, or a photo copied from TripAdvisor, is the first thing a visitor will not believe.

## What the site now does for you
- **The admin forms refuse** a picture hosted by a review site, social network, booking site or photo agency (TripAdvisor, Google, Facebook, Instagram, Pinterest, Booking.com, Airbnb, Getty and similar). Hotlinking is not permission to use a picture. The list is in `lib/image-hosts.json`.
- **A sponsor logo must be a picture file** (it ends in .png, .jpg, .svg and so on), never a web page. A page address shows as a broken image.
- **Placeholder pictures are refused** for real items (placehold.co, picsum and the like).
- **Free stock photos are accepted, but reported.** They are legal to use, but they are not pictures of Taita, so the audit lists them for replacement.
- **New content gets an honest "picture coming soon" image** (`/placeholders/taita-placeholder.svg`) instead of borrowing another item's picture. Replace each one.
- **Check what is live** at any time: `node scripts/audit-content.mjs` (it only reads). Before launch run it with `--strict`: it fails if anything must be fixed.

## Where real photographs come from
1. **Take them.** One afternoon with a decent phone in good morning or late-afternoon light, at the places already on the site, covers a lot. Photograph landscapes, not only people.
2. **Hosts supply their own.** Ask each host for at least five (see `docs/host-onboarding.md`). The host must own them or have the photographer's permission, and agree in writing (a WhatsApp message is fine; keep a screenshot).
3. **People in pictures must agree.** Makers, hosts and guides should know where their picture will appear. Be especially careful with children: get a parent's agreement or leave them out.
4. **Community photos** (the Field Crew and Field Notes) only with clear terms about who owns them and that they may be shown.
5. **Openly licensed photos** (for example on Wikimedia Commons) can be used if the licence allows it, and most need a credit. Open the picture's own page and read its licence before using it. There is no photo-credit field on pages yet, so put the credit in the story or listing text.
6. **Stock photos** are a temporary stand-in only. Never describe one as a specific place.

## A simple record
Keep a list (a spreadsheet is enough) with one row per picture: where it is used, who took it, who gave permission and when, and the licence. When someone asks "can we use this?", the answer should be one look away.

## Making them work on the site
- Landscape, at least 1,600 pixels wide, and compressed to well under 500 KB. The site makes smaller versions for phones, but a huge file still slows the first load.
- Add what the picture shows in the description (alt text), and say where it is only if it really is there.
- Host them on your own storage or domain (set the storage host in the site settings), not on another site.
- The home page picture is set with `HOME_HERO_IMAGE`, and the closing picture with `HOME_CLOSING_IMAGE`. Until you set them, the home page uses a stock photograph and says only that it shows early light over a ridge.
