# Security hardening: sign-in lifetime, passwords, and the application-status lookup

This step came from checking the site against a security checklist. It changes four things, each small. Everything described here is covered by `tests/security_hardening_test.tsx`.

## 1. How long a sign-in lasts
- **Staff** (anyone who can enter `/admin`: super admin, admin, editor, content manager): **12 hours** from the moment they typed their password, however busy they are. Using the site does not extend it, so a stolen admin cookie cannot stay useful for weeks. After 12 hours they sign in again and are taken back to the page they were on.
- **Everyone else:** **14 days** from their last visit (it was 30), then they sign in again.
- The numbers live in `lib/session-limits.ts` (`STAFF_SESSION_MAX_MS`, `SESSION_MAX_AGE_SECONDS`). Change them there; nothing else needs touching.
- It is enforced in two places: when the sign-in token is read (`lib/auth.ts`) and at the admin gate (`middleware.ts`), so an expired staff sign-in is turned back at the door, not only when something is saved.
- The existing protections still apply: a changed password, a suspended account or "sign out everywhere" end a session straight away, and staff roles are re-checked against the database about every minute.
- **Once, after this is deployed, every staff member will be asked to sign in again** (their old sign-ins do not record when they began, so they count as expired). Visitors and members are not affected.

## 2. The password rule
When someone **chooses** a password (sign-up and the reset link), it must be:
- at least **10** characters (`PASSWORD_MIN` in `lib/password-policy.ts`) and at most 72 bytes (a limit of the storage method, which silently ignores anything longer);
- not one of the passwords attackers try first, however it is dressed up (capitals, a year, a `!` on the end, `p@ssw0rd`-style swaps). The list includes words common in Kenya and on this site;
- not a run or a repeat (`1234567890`, `qwertyuiop`, `aaaaaaaaaa`);
- not containing the person's own name or the first part of their email.

There is deliberately **no** demand for capitals, digits or symbols: length matters most, and a phrase of unrelated words (`wide-sky-red-earth-lion`) is both stronger and easier to remember. To extend the list of refused words, add them to `COMMON` in the same file. The rule applies only to new passwords: nobody is locked out because an existing password would not pass today.

## 3. How passwords are stored
- Passwords are stored with bcrypt at cost **12** (`BCRYPT_COST` in `lib/password.ts`), up from 10: each guess costs an attacker about four times as much. A sign-in takes roughly a quarter of a second.
- Passwords stored at the old cost are **upgraded automatically** the next time their owner signs in, using the password they have just typed correctly. Nobody has to do anything, and if saving the upgrade fails they are still signed in. To raise the cost later, change the one constant: the upgrades follow.
- If sign-in ever feels slow on a small plan, the knob to turn is `BCRYPT_COST` (11 is about twice as fast). Keep the sign-in timing equal for existing and unknown addresses: the code already hashes a dummy password at the same cost for that reason.

## 4. "Where is my application?"
The partner application page used to answer anyone who typed an email address with that applicant's business name, type and status, or "No application found". That let anyone find out whether an address had applied. Now:
- the page gives **the same answer whether or not that address applied** ("If we have an application from that address, we have emailed its status to it");
- if it did apply, the status is **emailed to that address** (the wording is in `lib/partner-emails.ts`), so only the owner of the mailbox learns it; if it did not, nothing is sent;
- it is limited to **10 lookups an hour per connection** and **3 a day per address**, so it cannot be used to probe many addresses or to fill someone's inbox.

## What this step does not do
- **Two-factor sign-in for admins.** Admin accounts can issue refunds and change roles, so this is the most valuable next step. It is a real feature (authenticator-app codes, recovery codes, a way to reset a lost device), not a small patch, and should be its own piece of work.
- **Upgrade Next.js.** The site runs Next.js 14.2.35, which has published security advisories fixed in the 15.5 line. That is a larger migration, planned separately.
- **Sign-up still tells someone when an email already has an account** ("An account with that email already exists…"). This is a common trade-off for usability; the cure is an email-first sign-up flow, which is more change than this step.
