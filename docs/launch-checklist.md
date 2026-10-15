# Before the site goes public

Tick each line. Run `node scripts/audit-content.mjs --strict` at the end: it should say "No blockers".

## Safety and setup
- [ ] The database password that was once committed to the repository has been **changed** in Neon, and the new one is only in your hosting settings.
- [ ] `CRON_SECRET` is set, and the email job is scheduled every five minutes.
- [ ] The `main` branch on GitHub is protected (pull requests and the tests must pass before merging).
- [ ] Your host runs a Node version the site supports (20.9 or newer), checked before upgrading the site's framework.
- [ ] `NEXT_PUBLIC_APP_URL` is set to your real address, so shared links and calendar files use it.

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

## Languages
- [ ] Native speakers have read `lib/i18n/messages/sw.ts`, `fr.ts` and `de.ts`.
- [ ] You have decided which pages you will say are available in other languages (search engines are told only for pages that really are).

## Money
- [ ] One real payment through each method you offer (M-Pesa and cards): paid, confirmed, receipt received, and one refunded.
- [ ] One real booking and one real ticket, start to finish, including the email the visitor receives.

## On real phones
- [ ] A cheap Android phone on a mobile connection in Voi and in Wundanyi: the home page loads, a story reads, an enquiry sends, the planner works, the language offer behaves.
- [ ] Two or three people who have never seen the site try to find somewhere to stay and plan a day, while you watch and say nothing.
