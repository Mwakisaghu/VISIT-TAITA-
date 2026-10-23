# Before the site goes public

Tick each line. Run `node scripts/audit-content.mjs --strict` at the end: it should say "No blockers".

## Safety and setup
- [ ] The database password that was once committed to the repository has been **changed** in Neon, and the new one is only in your hosting settings.
- [ ] `CRON_SECRET` is set, and the email job is scheduled every five minutes.
- [ ] **Two-step sign-in** is switched on: the database change is applied, `TWO_FACTOR_KEY` is set (with a safe copy kept somewhere other than the hosting settings), every super admin has set it up and saved their recovery codes, and there are at least two super admins (`docs/two-step.md`).
- [ ] The `main` branch on GitHub is protected (pull requests and the tests must pass before merging).
- [ ] Your host runs a Node version the site supports (20.9 or newer), checked before upgrading the site's framework.
- [ ] `NEXT_PUBLIC_APP_URL` is set to your real address, so shared links and calendar files use it.

## The error log
- [ ] The database change `20261026090000_add_error_log` is applied to Neon (`npx prisma migrate deploy`) **before** the update goes live.
- [ ] After the update is live, you tested the log: open any page of the site, press F12, choose Console, type `setTimeout(() => { throw new Error("Test error: please ignore") })` and press Enter. Within a few seconds it should appear in the admin Error log under Browser. Mark it resolved.
- [ ] Your lawyer has read the new "Technical error reports" lines in the privacy policy (version 2026-10.5) and the matching row in `docs/data-protection.md`.
- [ ] Someone looks at the Error log every day for the first weeks (the bell and the overview show when something new has happened), and knows how to use a visitor's "Reference" code (`docs/error-log.md`).

## Content
- [ ] No sample items are showing (the audit lists them under "for your information"). Replace each with something real, or unpublish it.
- [ ] Every published stay, experience and event belongs to a **real host who agreed** (`docs/host-onboarding.md`).
- [ ] Every picture is one you own or have permission to use (`docs/photos.md`). The audit's "should fix" list is empty or understood.
- [ ] The test sponsors are gone (`node scripts/audit-content.mjs --hide-bad-sponsors --apply` moves unusable ones back to draft; delete any others in the admin area). Only real partners who agreed are shown.
- [ ] A local editor has read every story (especially Mwangeka and the Taita culture story) and the visitor essentials page.
- [ ] The visitor essentials facts have been checked again, and `LAST_CHECKED` in `app/essentials/page.tsx` is updated, together with its three translations.

## Legal
- [ ] The privacy page mentions the Taita Guide's AI (suggested wording in `docs/taita-guide.md`), if the AI is switched on, and is checked against your own legal advice and Kenya's Data Protection Act.
- [ ] You have read `docs/data-protection.md`: you know whether you must register with the Data Protection Commissioner, the breach steps are filled in (who does what, and the exact deadline), and the table of what you hold is correct.
- [ ] You have accepted the data processing terms of each provider (Netlify, Neon, Resend, Safaricom, Pesapal, and Anthropic if the AI is on), and the privacy policy's region for your database is correct.
- [ ] The Content-Security-Policy has run in report-only mode for a week with no unexpected `[csp]` lines, then `CSP_ENFORCE=1` is set (`docs/security-headers.md`).
- [x] The map library's licence question is resolved: the site no longer uses react-leaflet (`docs/third-party-licences.md`).
- [ ] If you add analytics, it is cookie-free and added to the policy first.
- [ ] A lawyer or professional translator has handled the privacy, terms and consent wording in any language other than English you want to offer.

## Refunds and cancellations
- [ ] You have read the **Refunds and cancellations** page (/refunds) and it describes how you really work: the shop's problem window (`SHOP_PROBLEM_DAYS`, now 7 days), its "change of mind" line, and the 3-working-day refund time (`lib/refund-policy.ts`).
- [ ] Every event organiser knows that, for tickets, **they** decide on and pay any refund (the page says so).
- [ ] Someone who can pay M-Pesa refunds by hand is named, because the shop has no refund tool (`docs/refunds-page.md`).
- [ ] A lawyer has read the page. A native speaker has checked the footer word "Refunds" in Kiswahili, French and German.

## Languages
- [ ] Native speakers have read `lib/i18n/messages/sw.ts`, `fr.ts` and `de.ts`.
- [ ] You have decided which pages you will say are available in other languages (search engines are told only for pages that really are).

## Email delivery
- [ ] Your own domain is **verified in Resend** and `EMAIL_FROM` is an address on it (not `onboarding@resend.dev`), and `RESEND_API_KEY` is a production key (`docs/email-delivery.md`).
- [ ] **DMARC** is added (start with `p=none` and a reports address) and you have a reminder to tighten it after a few clean weeks.
- [ ] You sent a real test (`npm run email:test -- you@example.com`, with a real address instead of the example) to **Gmail and Outlook or Hotmail**, it reached the **inbox**, and "Show original" says SPF, DKIM and DMARC pass.
- [ ] The admin **Emails** page shows the green "Email is configured and automatic retries are on" (so `CRON_SECRET` is set and the five-minute job runs).

## Backups
- [ ] You have written down your Neon **restore window** (`docs/backup-and-restore.md`) and a **separate weekly copy** of the database exists, encrypted, outside Neon.
- [ ] A copy of the picture bucket exists somewhere else.
- [ ] **`TWO_FACTOR_KEY` and every other secret** are saved in an encrypted list outside the hosting settings, and a second trusted person can open it.
- [ ] At least **two people** can get into GitHub, Netlify, Neon, the bucket, the domain registrar, Resend, Safaricom and Pesapal.
- [ ] You did **one restore practice** (into a new, empty database) and wrote the date in `docs/backup-and-restore.md`.

## Money
- [ ] One real payment through each method you offer (M-Pesa and cards): paid, confirmed, receipt received, and one refunded.
- [ ] One real booking and one real ticket, start to finish, including the email the visitor receives.

## Staff runbook
- [ ] Everyone who looks after the site has read `docs/staff-runbook.md`, and the "Who to call" table in it is filled in.
- [ ] You practised the three money jobs once with test data: **cancel a booking and record its refund**, **prepare and record a host payout**, and **cancel a shop order and record its refund**, and **give a part refund on another**.
- [ ] Someone who can send M-Pesa refunds is named, (Orders are for admins only: editors and content managers cannot see or change them.)

## On real phones
- [ ] A cheap Android phone on a mobile connection in Voi and in Wundanyi: the home page loads, a story reads, an enquiry sends, the planner works, the language offer behaves.
- [ ] Two or three people who have never seen the site try to find somewhere to stay and plan a day, while you watch and say nothing.
