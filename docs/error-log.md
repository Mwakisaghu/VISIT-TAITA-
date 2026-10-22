# The error log

The admin **Error log** (People & access → Error log, for admins only) shows what went wrong for real visitors and staff, in their browsers and on our server, so problems are found by us and not only by complaints.

## How an error gets there
- **On our server:** a page that cannot be built, an API route that throws, or a server action that fails. Next.js calls `onRequestError` in `instrumentation.ts`, which saves it (`lib/error-log.ts`). A redirect or a "not found" is not a failure and is not saved. Failures in the edge environment (the middleware) are not captured.
- **In a visitor's browser:** a script error or an unhandled promise failure is sent by `components/ErrorReporter.tsx` to `/api/errors`. A page sends at most 5 different failures, each once. The error pages ("Something went wrong on our side") also report, but only failures the server has not already recorded.
- **The "Reference" code:** the error page shows a short Reference code. A server failure is saved with the same code, so when a visitor reads it out, paste it into the search box and you land on the error.

## What is kept, and what is not
- Kept: what went wrong and a technical trace, the page path, the browser family and major version (for example "Chrome 120 · Android"), the page language, whether anyone was signed in, the running version of the site, and the time.
- **Never kept:** an IP address, a cookie, a name, an email address, or anything after a `?` in a web address. Emails, phone numbers, tokens, M-Pesa receipt codes, card-length numbers and secrets in a ticket, check-in, plan or reset address are removed **before** saving (`lib/error-scrub.ts`). The database has no column where such a thing could be stored (a test checks the table's fields).
- **A known limit:** a random token with no digits, written bare in an error message, looks exactly like an ordinary camelCase name and is not removed. The site's code never puts a secret into an error message (a test checks every source file), so there should be none to remove.
- **Retention:** each occurrence for 30 days; an error not seen for 90 days is then removed, with its occurrences. The daily job does this; "Tidy old reports now" does it on demand. The privacy policy says the same, and a test keeps the two in step.

## Using it
- **Open / Resolved / Ignored.** The same failure is one line with a count. **Mark as resolved** when you have fixed it: if it happens again it opens again, marked "Back again". **Ignore** one you cannot or will not fix (an old browser, say): it is still counted but no new occurrences are kept.
- The bell, the "Needs your attention" list and the menu show how many open errors were seen in the last 24 hours.
- Every resolve, ignore, reopen, delete and tidy is written to the activity log.
- A trace from the browser is of minified code (not easy to read). The error's message, page and count are usually enough to start. Showing readable traces would need source maps, which also publish the site's source code: decide that on purpose, not by accident.

## Protection against abuse
`/api/errors` is public, so it only accepts a report from the site's own pages, ignores bots, takes at most 16 KB, allows one visitor 20 reports an hour and the whole site 3000 a day, and always answers the same empty 204 so it reveals nothing.

## Not built
Email alerts when a new error appears, a log of "page not found" addresses (broken links), and readable (source-mapped) traces.
