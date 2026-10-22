# Email delivery: making sure your emails arrive

Visit Taita sends email through **Resend** (`lib/email.ts`). Email is not a nice extra here: these all depend on it, and a visitor who never receives one cannot finish:

- **Account:** the link to confirm an email address, password resets, two-step sign-in notices (`lib/account-verification.ts`, `lib/actions/account-email.ts`, `lib/actions/two-step.ts`).
- **Money:** booking confirmations and refunds (`lib/booking-emails.ts`), event tickets (`lib/ticket-emails.ts`), host payouts (`lib/payout-emails.ts`).
- **Staff and hosts:** notifications of enquiries, applications and the contact form (`lib/notifications.ts`, `lib/actions/contact.ts`, `lib/actions/partners.ts`).
- **Newsletter:** confirmations and issues (`lib/newsletter-subscribe.ts`).

## Where you are today
`EMAIL_FROM` defaults to Resend's shared test address, `onboarding@resend.dev`. **That address only delivers to the one address your Resend account was created with.** Until you verify your own domain, every email to a customer is refused (the admin **Emails** page shows a yellow "You're using Resend's test sender" warning, and the refused emails appear there with Resend's reason and are retried). If `RESEND_API_KEY` or `EMAIL_FROM` is missing altogether, emails are skipped and nothing is queued (a red warning on the same page).

## What the site already does right
- Every email is written to an **outbox** (`EmailLog`) before it is sent, so a failure is visible and is **retried** (this needs `CRON_SECRET` set and a scheduler calling `/api/cron/emails` every five minutes; the Emails page warns if it is off). A retry reuses an idempotency key, so a customer is not sent the same email twice.
- Newsletters and confirmation requests carry the **one-click unsubscribe** headers (`List-Unsubscribe` and `List-Unsubscribe-Post`), which Gmail and Yahoo expect from anyone sending in bulk.

## Setting it up (about an hour, most of it waiting for DNS)
1. **Pick the sender.** An address on a domain you own, for example `hello@yourdomain.co.ke`. Many senders use a subdomain for automatic email (for example `mail.yourdomain.co.ke`) so a problem with it can never harm the reputation of the main domain: either is fine, but decide now, because it is awkward to change later.
2. **Add the domain in Resend** (Domains, then Add domain). Resend then shows you the DNS records to create. Typically these are a **DKIM** record (a long TXT value that lets receivers check the email really came from you) and records for **SPF** and bounce handling. **Copy them exactly as Resend shows them: this document deliberately does not repeat their values, which are specific to your account.**
3. **Create those records where your DNS is hosted.** That is wherever your domain's name servers point (your registrar, Cloudflare or Netlify DNS: look up the domain's NS records if you are unsure). Two common mistakes: the DNS provider adds your domain name to the end of a name that already contains it (so `resend._domainkey.yourdomain.co.ke.yourdomain.co.ke`), and a TXT value pasted with its quotation marks or broken into pieces. Wait until Resend says **Verified** (minutes to a day).
4. **Add DMARC** (this is the one you do alone). Create a TXT record at `_dmarc.yourdomain.co.ke`. Start by **watching only**:
   `v=DMARC1; p=none; rua=mailto:dmarc-reports@yourdomain.co.ke`
   The `rua` address receives daily summary reports of who is sending email as your domain. After two to four weeks in which every report shows only your own mail passing, tighten to `p=quarantine`, and later `p=reject`. **Do not start with `reject`:** one forgotten sender (a newsletter tool, an old contact form) would then be thrown away silently. A domain may have only ONE DMARC record.
5. **Set the two settings in Netlify** and redeploy: `EMAIL_FROM` (for example `Visit Taita <hello@yourdomain.co.ke>`) and `RESEND_API_KEY` (create a new key for production in Resend, so a leaked development key cannot send as you). Set `CRON_SECRET` and schedule the retry job (see `docs/launch-checklist.md`).
6. **Test with the real thing**, not just the green banner: `npm run email:test -- you@example.com` (put a real address of yours instead of the example; it sends one test email using the same settings as the site). Do it for **a Gmail address, an Outlook or Hotmail address, and the address your host or staff actually use**. Check each arrives in the **inbox**, not spam. In Gmail open the email, choose "Show original", and look for `SPF: PASS`, `DKIM: PASS` and `DMARC: PASS`. Then place a real test booking and read the email it sends.

## Keeping it healthy
- **Look at the admin Emails page** now and then (and after any change to email settings): it should show the green "Email is configured and automatic retries are on".
- **In Resend, watch bounces and spam complaints** weekly. Gmail and Yahoo penalise senders whose spam-complaint rate is above about 0.3 percent, and a small new domain has little reputation to spare.
- **A new domain starts with no reputation.** Begin with the automatic emails (tickets, confirmations), and do not send the first newsletter to a large list in one go.
- Read the DMARC reports (or have a free report reader do it) during the first weeks.

## When something goes wrong
| What you see | Most likely cause |
| --- | --- |
| Only you receive emails | Still on the test sender (`onboarding@resend.dev`): finish steps 2 to 5. |
| Domain stuck on "Pending" in Resend | A DNS record has a typo, the name has your domain doubled, or DNS has not spread yet. Compare each record with Resend's, character for character. |
| Emails land in spam | DMARC or DKIM missing or failing (check "Show original"), a brand-new domain, or the email's own content. |
| Gmail shows "via amazonses.com" or similar | The sending domain is not fully aligned with `EMAIL_FROM`: re-check the DKIM and SPF records. |
| Emails sit as pending or failed on the Emails page | Read Resend's reason there. If the retry job is off, set `CRON_SECRET` and the schedule. |
| Nothing is queued at all | `RESEND_API_KEY` or `EMAIL_FROM` is missing in the hosting settings. |

I have not been able to check your DNS or your Resend account from here: these steps follow Resend's own domain setup, which is the authority if the two ever differ.
