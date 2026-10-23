# Data protection: what to keep, who to tell, what to do if something goes wrong

This is a working guide, not legal advice. Have a Kenyan data-protection lawyer read it, and the privacy policy it supports, before launch. Where a deadline is mentioned, **confirm it with your lawyer**.

## 1. Are you registered?
Kenya's Data Protection Act, 2019 and its regulations require some organisations that handle personal data to register with the Office of the Data Protection Commissioner (ODPC). Ask your lawyer whether you must. If you register, put the number in the hosting settings as `ODPC_REGISTRATION_NUMBER` and the privacy page will show it. Also set `SITE_LEGAL_NAME`, `CONTACT_ADDRESS`, `PRIVACY_EMAIL`, `CONTACT_EMAIL` and `LEGAL_REVIEWED_ON` (the date a lawyer reviewed the policy; until it is set, the pages show a "draft" notice).

## 2. What you hold, and why (your record of processing)
Keep this table current. It is the first thing a regulator or a lawyer will ask for.

| What | Why | Where | Who can see it | How long |
|---|---|---|---|---|
| Account: name, email, password (hashed) | Sign-in | Neon (database) | The visitor; admins | Until the account is deleted |
| Passport: check-ins, points, rewards | The Passport | Neon | The visitor; admins | Until the account is deleted |
| Enquiries: name, email, phone, message | Put visitors in touch with hosts | Neon; emailed to the host | The host; admins | While needed, then anonymised |
| Bookings and payments | Take and refund bookings | Neon; Safaricom, Pesapal | The visitor; the host; admins | Payment records kept for accounting |
| Shop orders and any refund of them: name, phone, address | Deliver orders | Neon; Safaricom, Pesapal | The visitor; the maker or seller; admins | Records kept for accounting |
| Event tickets: name, phone | Tickets | Neon | The organiser; admins | Per the policy |
| Newsletter: email | Send the newsletter after confirmation | Neon; Resend | Admins | Until unsubscribed (do-not-email list kept) |
| Partner and sponsor applications | Decide on partnerships | Neon | Admins | While needed |
| Contact messages | Reply | Neon; Resend | Admins | While needed |
| Email delivery records | Retry failures | Neon | Admins | Text cleared at delivery; records deleted after 30 days |
| Technical error reports: what went wrong and a technical trace, the page address without its query string, the browser family and version, whether anyone was signed in (not who), the time. **No IP address, cookie, name or email.** | Find and fix problems | Neon | Admins only (not editors) | Each occurrence 30 days; an error not seen for 90 days is then removed (`docs/error-log.md`) |
| Taita Guide questions (only if the AI is on) | Answer the question | **Not stored by us.** Sent to Anthropic to write the answer | No one at Visit Taita | Not kept by us |
| Page-view counts | See which pages are read | Neon | Admins | Totals per page per day; no person recorded |
| Language, cart, plan draft, Guide note | Remember a choice | The visitor's own browser | The visitor | Until cleared (language cookie: one year) |

## 3. Your providers, and the agreements to accept
Each provider that handles personal data for you should have a data processing agreement (DPA) with you. Most offer one to accept in their dashboard or terms. Do this, and note the date.

| Provider | What it does for you | Do this |
|---|---|---|
| Netlify | Hosts and delivers the site | Accept its data processing terms; note where it processes data |
| Neon | The database | Accept its DPA; note the region your database is in (the policy says the United States: correct it if it is not) |
| Resend | Sends email | Accept its DPA |
| Safaricom (M-Pesa) | Mobile payments | Keep the signed Daraja agreement on file |
| Pesapal | Card and other payments | Keep the merchant agreement on file |
| Anthropic | The optional AI guide | Accept its commercial terms and data processing terms. Switch the AI on only after you have done so, and set a spending limit |

## 4. If something goes wrong: a breach
A breach is when personal data is lost, stolen, seen by someone who should not, or changed without permission. Examples: the database password leaks; an admin account is taken over; a wrong email goes to many people; a host sees another host's enquiries.

1. **Stop it.** Change the password or key that leaked (database, hosting, email service, the site's secret). Sign out everyone if an account was taken (admin area, "sign out everywhere"). Take the affected page offline if you must.
2. **Write it down straight away.** What happened, when you found out, what data and how many people, what you did. Keep it in one document, with times.
3. **Decide who is at risk.** Passwords are stored hashed; payment card details and M-Pesa PINs are never held by the site. Work out exactly which of the table above was exposed.
4. **Tell the ODPC.** Kenyan law requires a controller to notify the Data Protection Commissioner of a breach quickly, and I believe the limit is **72 hours** from becoming aware. Confirm the exact rule and how to file with your lawyer *before* launch, and write the steps here: ______.
5. **Tell the people affected** if there is a real risk to them, in plain words: what happened, what data, what to do (for example change a password), and who to contact (`PRIVACY_EMAIL`).
6. **Tell your providers** if the cause is on their side, and ask for their report.
7. **Afterwards:** find the cause, fix it, add a test or a check so it cannot repeat, and update this document and the privacy policy if anything changed.

Who does what (fill in names): decides ______ · contacts the ODPC ______ · contacts affected people ______ · technical fix ______.

## 5. When someone asks to use their rights
Most requests can be done by the person themselves: **Download my data** and **Delete my account** are on the account page. For anything else (for example an enquiry sent without an account), the privacy page says to use the contact form.
1. Reply and confirm who they are (do not hand over data to someone you have not checked).
2. Do it, and tell them what you did. Kenyan rules set short deadlines for answering requests: ask your lawyer for the exact times and write them here: ______.
3. Keep a short note of the request and what you did.

## 6. When to update the privacy policy
Update `lib/legal-text.ts` and the version in `lib/site-info.ts` whenever the site starts to: set a new cookie or use new browser storage, call a new outside service, add analytics or advertising, or keep something longer or differently. Two tests enforce part of this for you: they fail if the code uses a cookie or browser storage the policy does not describe, or talks to an outside service the policy does not name. They cannot read minds, so when you add a feature that collects something new, ask the question yourself.

## 7. Analytics
The site counts page views per page per day without recording who you are, and uses no tracking cookies, so it needs no cookie banner. If you add an analytics tool, choose one that sets no cookies and does not follow people across sites (Plausible and Umami are examples), add it to the policy and to the table above, and re-run the tests. If you ever add advertising or cross-site tracking, you will need a cookie consent banner and a rewrite of the cookies section.
