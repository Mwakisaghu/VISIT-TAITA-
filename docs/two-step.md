# Two-step sign-in

Signing in asks for the password and then a 6-digit code from an authenticator app (Google Authenticator, Microsoft Authenticator, Authy, 1Password), or one of ten single-use recovery codes. There is **no SMS**: in Kenya a swapped SIM receives the SMS, and an app works offline.

## Switching it on (read this first)
1. **Apply the database change** (`prisma/migrations/20261020090000_add_two_step`) BEFORE setting the key. It adds two tables and nothing else.
2. **Set `TWO_FACTOR_KEY`** in the hosting settings: 32 random bytes as base64 (`openssl rand -base64 32`). It encrypts every person's secret.
   - **Keep a safe copy of it.** If it is lost or changed, every secret and recovery code stops working and people must be reset by hand (see below). It is never in the code or the database.
   - **No key means the whole feature is OFF** and nothing changes for anyone. Setting the key is the switch that starts it.
3. From then on: **every staff role must set it up** (they are held at the setup page, with no privileges, until they do). Members are offered it in Settings, under "Sign-in and security".
4. Optional: `TWO_FACTOR_MONEY_ROLES_FROM=2026-12-01` makes partners, sellers and event managers follow from that date (midnight in Kenya). Without it they are never required.

## How it is protected
- The secret is stored **encrypted** (AES-256-GCM); a copy of the database alone is not enough to make anyone's codes. Recovery codes are stored only as keyed fingerprints.
- A code works **once** (the 30-second step it belongs to is remembered, claimed atomically, so two simultaneous requests cannot both use it), and one step either side is accepted for phone clocks.
- **Guessing is limited:** 8 code attempts per account and 40 per connection in 15 minutes. Sensitive changes (new recovery codes, turning it off) need the password AND a code, limited to 6 attempts.
- The code is checked **before any session is issued**; there is no way to a session around it. A database error refuses the sign-in (never lets anyone through). A lost key never silently turns it off: people who had it on are refused ("unavailable"), others carry on.
- Someone who must set it up but has not gets a session with **no privileges** (their role is set aside, not removed). Every existing admin check refuses them with nothing to forget, and the admin gate sends them to the setup page. The moment they finish, the role comes back without signing in again.
- Staff cannot turn it off. Members can, with their password and a code. The owner is emailed whenever it is turned on or off, and an audit entry is written.

## When someone is locked out (lost phone AND recovery codes)
1. **Another super admin resets it, with a delay.** Under **Users**, open the person, and in **Two-step sign-in** choose "Reset their two-step sign-in". Only a super admin can (never for themselves, never an ordinary admin).
   - The person is **emailed at once** with a link to cancel it, and the other super admins are told, so it cannot happen quietly. It is in the audit log.
   - **Nothing changes for 24 hours.** After that it takes effect **the next time they sign in** (after their password is checked): their second step and recovery codes are removed and they are signed out everywhere. They are emailed again. If their role requires two-step, they must set it up again before they can use the admin area.
   - **Any super admin can cancel** from the same page, and the person can cancel from their email. A cancelled request never takes effect, and neither does one that is more than a week overdue (ask again).
   - It needs `NEXT_PUBLIC_APP_URL` (the cancel link must be a real address); without it nothing is started. It needs no scheduled job.
   - Opening the emailed link does **not** cancel anything (mail scanners open links): the page has one button.
2. **Break-glass, for whoever controls the database** (when no other super admin can do step 1):
   `DATABASE_URL="postgresql://..." node scripts/two-step-reset.mjs person@example.org`
   It asks you to type the address again and the word RESET, removes their second step and recovery codes, signs them out everywhere, and writes an audit entry. Then tell them **by another way** (a phone call) that it was done.
3. Keep at least **two super admins**, each with their recovery codes saved in a different place. The admin area shows a warning whenever there is fewer than two active ones.

## For members: a code by email, and remembering a browser
Both are **weaker than an authenticator app**, so they are offered only to ordinary accounts, never to staff or to roles that handle other people's money (not even before their requirement date).
- **A code by email** (instead of an app): on the setup page a member with a verified address can choose "Use a code sent to my email instead". It proves they can read that address, then makes ten recovery codes like the app does. At each sign-in a fresh 6-digit code is emailed. A code works **once**, lives **10 minutes**, allows **5 tries** (the try is taken before the comparison, so parallel guesses cannot beat it), and only a keyed fingerprint is stored. Asking for codes is limited (3 in 15 minutes per person). The product says plainly that it is easier but weaker: anyone who can open the person's email can read the code (and could also reset the password).
  - If someone on the email method is later made staff, they are **held with no privileges until they switch to the app** (the setup page shows a "Switch to an authenticator app" button): an emailed code does not meet the requirement.
- **Remember this browser for 30 days:** a checkbox on the second step. A cookie called `taita-trusted-browser` (random value, only a fingerprint stored, `httpOnly`, `sameSite=lax`, `secure` in production) lets that browser skip the code. It ends after 30 days, or when the person changes their password, signs out everywhere, turns two-step off, has it reset, or chooses "Forget my browsers". A code that is typed is always checked: the cookie is only used when no code is given. The privacy policy (version 2026-10.4) and its guard test describe this cookie; adding another cookie without updating both makes that test fail.

## What a half-finished sign-in cannot do
Staff who must set up two-step but have not yet get a session with no privileges. Two helpers that read the person's real role from the database (the user-management helper and the bookings helper, whose "admin" flag guards refunds) honour that themselves, because server actions are public endpoints that cannot rely on the admin gate alone. Tests pin both.

## Not built yet
- **Changing the key** (`TWO_FACTOR_KEY`) safely: replacing it makes every stored secret and recovery code unreadable. A proper rotation step (re-encrypt everything under a new key) does not exist, so keep the key and a safe copy of it, and never change it.
- Switching between the app and the emailed code without turning two-step off first (a member does that today: turn off with proof, then set up the other).
- A list of remembered browsers (today the person sees a count and can forget them all).
- A person-to-person "someone is signing in from a new place" notice.
