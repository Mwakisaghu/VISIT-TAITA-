# Signing your first real hosts

Five or six real, named hosts with real photographs will do more for the site than any new feature. This is a one-page kit for bringing a host on properly.

## What to collect from each host
| Ask for | Why |
|---|---|
| Their name and the business name, and a phone number to reach them | So the listing is a real person you can name |
| A clear "yes, please list us", in writing (a WhatsApp message is fine; keep a screenshot) | Listing a real business needs its agreement |
| The contact details they want shown, and who answers enquiries | Enquiries go to the host; the page must not show a number nobody answers |
| A "from" price per person or per night, and what it includes | The site shows "from" prices; hosts confirm the final price |
| At least five photographs they own, and the names of any people in them | See `docs/photos.md` |
| A short description in their own words (and the languages they speak) | It reads like a person, not an advert |
| Any licence or registration they hold (for guides, tour operators and accommodation: ask whether they are registered with the Tourism Regulatory Authority, and which parks they are allowed to guide in) | Visitors trust it, and it keeps the site honest. Check what applies to each kind of business |
| Their cancellation approach | Shown to visitors before they book |
| Payout details (M-Pesa till or paybill) | Entered by the host in the partner area, never sent in a chat message |

## A first message (English)
> Hello [name], I'm [your name] from Visit Taita, a new site that helps people discover Taita Taveta through the people who live and work here. We would like to list [business] so visitors can find you and contact you directly. There is no cost to be listed. If you agree, I'll need a few photos you own, a short description, and your contact details. Could I call you this week to explain?

## A first message (Kiswahili, for review by a native speaker)
> Habari [jina], mimi ni [jina lako] kutoka Visit Taita, tovuti mpya inayowasaidia watu kugundua Taita Taveta kupitia watu wanaoishi na kufanya kazi hapa. Tungependa kuorodhesha [biashara] ili wageni waweze kukupata na kuwasiliana nawe moja kwa moja. Hakuna gharama kuorodheshwa. Ukikubali, nitahitaji picha chache ambazo ni zako, maelezo mafupi, na mawasiliano yako. Naweza kukupigia simu wiki hii kukueleza?

## What to do once they agree
1. Add the listing in the admin area with their real details and photographs, and leave it as a **draft**.
2. Send the host the draft page and ask them to confirm every line (the price, the description, the photos).
3. Only then publish it.
4. Run `node scripts/audit-content.mjs` and confirm nothing is flagged for that listing.
5. Do one real test: make an enquiry yourself and check that the host receives it.

## Promise only what is true
Do not tell a host the site will bring bookings, rank them, or offer exclusivity. Say what it does: lists them, shows their own photos and words, and sends enquiries straight to them.
