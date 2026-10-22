# Backups and getting back up after a disaster

A backup you have never restored is a hope, not a backup. This page says what you have, where it lives, what is **not** protected, and how to practise getting it back.

## What exists, and where
| What | Where it lives | If it were lost |
| --- | --- | --- |
| **The code** | GitHub (`Mwakisaghu/VISIT-TAITA-`), and copies on your computers | Easy: it is all on GitHub. Keep two-step sign-in on for the GitHub account. |
| **The database**: every person, booking, ticket, order, story and error report | PostgreSQL on Neon (`DATABASE_URL`) | **The one that cannot be rebuilt.** See below. |
| **The pictures** | Your S3-compatible bucket (Cloudflare R2 or AWS S3: the `S3_...` settings). The database holds only their addresses. | Every picture breaks. Rebuilding means collecting each one again. |
| **The settings and secrets** | Only in the Netlify settings (never in the code) | The site cannot start, and some of it **cannot be recovered**: see the list below. |
| **The domain name and its DNS** | Your registrar (and wherever the DNS is hosted) | The site and your email address vanish together. |
| **The merchant accounts** | Safaricom (M-Pesa) and Pesapal, in your name | Not backed up by anyone but them. Keep the account details and who can reach them. |

## The database
- **Neon can rewind.** It keeps a history so a project (or a copy of it, called a branch) can be restored to an earlier moment. **How far back depends on your plan, and a free plan's window is short: look up yours in the Neon console and write it here: Our restore window: ______.** Neon's own documentation is the authority on how to do it.
- **Do not rely on that alone.** Keep a regular, separate copy that lives somewhere other than Neon: once a week, and **before every database change** (every `prisma migrate deploy`). With the PostgreSQL command line tools installed (`pg_dump`):
  `pg_dump "<the DIRECT connection string>" --format=custom --file=visittaita-2026-01-31.dump`
  Neon gives two connection strings: a pooled one (its host name contains `-pooler`) and a direct one. **Use the direct one for dumps.**
- **A dump contains everyone's personal data.** Encrypt it before it goes anywhere (for example a 7-Zip archive with an AES-256 password, or `age`), keep it off shared drives, delete old ones, and **never commit it** (`.gitignore` refuses `*.dump` and a `backups/` folder, and a test checks that). Ask your lawyer how long backups may keep data after someone asks to be deleted, and say so in the privacy policy.
- **Restoring: never over the live database first.** Create a **new, empty** database (a new Neon project or branch), then:
  `pg_restore --no-owner --clean --if-exists --dbname "<the new database's DIRECT connection string>" visittaita-2026-01-31.dump`
  Point a local copy of the site at it, run `npx prisma migrate deploy` (so its structure is current), and look: sign in, open a booking, count the rows. Only when it is right do you change `DATABASE_URL` in Netlify and redeploy.

## The pictures
The bucket holds the files and the database holds their addresses, so you need both to match. Keep a second copy of the bucket somewhere else: with `rclone` (a free command-line tool) `rclone copy yourremote:yourbucket ./pictures-backup`, monthly and after a big upload. If you add pictures often, do it more often.

## The settings and secrets
Keep **one encrypted list** (a password manager's secure notes is ideal) with the **value** of every secret below, plus who may see it. Netlify will show the values, but if the account itself were lost, so would they. Settings that are secret (`.env.example` is the full list of names; a test keeps this table in step with it):

| Setting | What happens if it is lost |
| --- | --- |
| `TWO_FACTOR_KEY` | **Cannot be recovered or replaced.** Every person's two-step secret and recovery codes become unreadable and each person must be reset by hand (`docs/two-step.md`). Keep a copy somewhere other than the hosting settings. |
| `DATABASE_URL` | Reissue it in Neon (it contains the database password). |
| `NEXTAUTH_SECRET` | Replaceable. Changing it signs everyone out, which is harmless. |
| `CRON_SECRET` | Replaceable: set a new one in the hosting settings and in the scheduler. |
| `RESEND_API_KEY` | Replaceable: create a new key in Resend. |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Replaceable: create new access keys for the bucket. |
| `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY` | Reissued by Safaricom; payments stop until then. |
| `PESAPAL_CONSUMER_KEY`, `PESAPAL_CONSUMER_SECRET` | Reissued by Pesapal; card payments stop until then. |
| `ANTHROPIC_API_KEY` | Replaceable: create a new key (and keep a spending limit on it). |

## Who can get in
**At least two trusted people** must be able to reach each of: GitHub, Netlify, Neon, the picture bucket, the domain registrar, Resend, and the Safaricom and Pesapal accounts, each with two-step sign-in on. If only one person can, then that person being ill, travelling or locked out is a disaster of its own.

## If something goes wrong
| What happened | First steps |
| --- | --- |
| A bad update broke the site | Netlify: Deploys, then "Publish deploy" on the last good one. Instant, no code change (`docs/nextjs-upgrade.md`). |
| A bad database change, or data deleted by mistake | Do not change anything further. Restore to a **new** branch from before it happened (Neon), look, then switch or copy back what you need. |
| Neon is down | The site cannot load data until it is back: watch Neon's status page and tell visitors on your social channels. |
| The picture bucket is gone or emptied | Restore from your copy of the bucket. |
| `TWO_FACTOR_KEY` is lost | Put back the saved copy. If there is none, follow `docs/two-step.md` and reset each person. |
| A GitHub or Netlify account is lost | Recover through the account's own recovery route; this is why two people need access. |

## Practise it (the part everyone skips)
Once every three months, for half an hour: restore the latest dump into a new empty database, check the numbers look right, delete it, and **write the date below**. Also try opening the encrypted settings list. If the practice fails, you have found out cheaply.

Last restore practice: ______ (date) by ______ . Result: ______ .
