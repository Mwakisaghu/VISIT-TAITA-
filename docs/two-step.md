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
1. **Another super admin cannot reset them yet** (planned: a 24-hour delayed reset with notifications).
2. **Break-glass, for whoever controls the database:**
   `DATABASE_URL="postgresql://..." node scripts/two-step-reset.mjs person@example.org`
   It asks you to type the address again and the word RESET, removes their second step and recovery codes, signs them out everywhere, and writes an audit entry. Then tell them **by another way** (a phone call) that it was done. If they must use two-step they set it up again at their next sign-in.
3. Keep at least **two super admins**, each with their recovery codes saved in a different place.

## Not in this step yet
- Email codes as an alternative for members (never for staff).
- "Remember this browser for 30 days" for members (it needs a cookie, so the privacy page and its guard test must change with it).
- A super admin resetting someone else's two-step from the admin area (with a delay, notices and the audit trail), and a warning when there is only one super admin.
