# Offline use: "Save for offline"

A visitor in a park with no signal can still read the visitor essentials, or a day they planned. This page says how it works, what it will and will not keep, and how to test it.

## The rules (a test enforces each one)
- **Nothing is saved on its own.** No worker is installed and nothing is stored until a visitor presses **Save for offline**. Visitors who never press it have nothing stored by this feature.
- **Only two kinds of page can ever be saved:** the visitor essentials (`/essentials`, in every language) and one shared itinerary (`/plan/<12-character code>`, in every language), plus the plain files those pages need (scripts, styles, fonts, pictures).
- **Never saved, whatever anyone does:** the **Plan builder** (`/plan`, which shows a signed-in visitor's own plans), accounts, orders, tickets, bookings, payments, the basket, the passport, sign-in, the staff admin and every API answer. They are not on the list in `public/sw.js`, so they are always fetched live and are never shown from a copy. With no signal they get the offline page.
- **Everything is kept on the visitor's own device**, nothing is sent anywhere, and the visitor can remove one page (the button), or everything (the offline page).
- **It uses no local storage, session storage or cookie.** The saved pages are the only record: each carries the time it was saved (a header the worker adds), and the offline page reads its title and language from the saved page itself. So there is nothing to get out of step, and no extra named storage for the privacy policy to list (the privacy test enforces the list of seven).
- A saved page is **refreshed whenever it is opened with a signal**, and when there is no signal the page says it is a copy saved earlier and that times, fares and fees may have changed.

## The pieces
| File | What it does |
| --- | --- |
| `public/sw.js` | The worker: the allow-list, saving, refreshing, serving a copy, removing. It is served with no caching so a visitor is never stuck on an old one (`next.config.js`). |
| `public/offline.html` | Shown when something not saved is asked for with no signal. It lists what is saved on this device, in the visitor's language, with "remove all". It is one self-contained file because it must work with no signal. |
| `components/offline/OfflineSaveButton.tsx` | The button, on `/essentials` and on a shared itinerary. The only place the worker is registered. |
| `components/offline/OfflineNotice.tsx` | The "you are offline" notice on those two pages. |
| `lib/offline-client.ts` | How to talk to the worker, and how to see what is saved (by asking the cache). |
| `app/manifest.ts` and `public/icons/` | What a phone needs to offer "add to home screen". The icons are the logo at 192 and 512 pixels. |

## Changing the worker
If you change `public/sw.js`, **raise `VERSION`** at its top (and `PAGES` / `ASSETS` in `public/offline.html` if the names change). The new worker then deletes its old caches itself. A test checks that the names agree everywhere and that the token rule is identical to `isToken` in `lib/plan.ts`.

## Testing by hand
1. On a phone, open `/essentials`, press **Save for offline**, and wait for "Saved for offline".
2. Turn on **airplane mode** and reload the page: it opens from the copy, with the offline notice.
3. Open `/account` in airplane mode: you must get the offline page, never a copy of an account.
4. On the offline page, check the saved page is listed, then use **Remove all saved copies**.
5. If something looks stuck, remove the site's data in the browser settings.

## Things to know
- Saved pages cannot do what needs the internet: the Plan builder, saving a plan, the concierge, payments.
- Some browsers (Safari on iPhone in particular) may clear saved pages if the site is not used for a while; adding the site to the home screen helps. This is the browser's choice, not something the site can prevent.
- A shared itinerary's address is a secret link; a saved copy is on the device of whoever pressed the button.
- The Content-Security-Policy allows the worker (`worker-src 'self'`) and the manifest, so switching `CSP_ENFORCE=1` on does not break this: test it again when you do.
