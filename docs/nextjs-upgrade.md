# The Next.js 15 upgrade

## Why
The site ran Next.js 14.2.35, the last release of the 14 line. Checking it against the public advisory database (`npm audit`) found about two dozen published security advisories against it, two rated critical and many rated high, several of them about Server Components and Server Actions, which this site uses heavily. All of them are fixed in **Next.js 15.5.24 or later**. The site now runs **15.5.28** with **React 19**.

Not every advisory applies to every host (one needs a Windows server, some affect only self-hosted servers), and I cannot say how much of the rest Netlify's runtime already shields you from. The safe position is to be on a patched version.

## What changed
1. **Versions:** `next` and `eslint-config-next` 15.5.28 (pinned exactly), `react` and `react-dom` 19, and their type packages. `package.json` now also says which Node it needs (`engines`: 18.18 or newer, which Next.js 15 requires).
2. **Request details are read with `await`.** In Next.js 15, `headers()`, `cookies()` and a page's `params` and `searchParams` are asynchronous. The official Next.js codemod converted about 73 files; four small helpers (`clientIp()` in the enquiry, sponsor, account and search code) became `async`.
3. **React 19's type changes:** four one-line fixes (a ref type, a `useRef` with no starting value, the removed global `JSX` type).
4. **The map no longer uses `react-leaflet`** (a separate step, applied first): it crashed under React 19.
5. **The tests** (`tests/`, if you have them) were made to read the page the way a browser does (see below).
6. **One deliberate leftover, the language helper (read this before Next.js 16).**

## The one deliberate synchronous read (a debt)
`lib/i18n/server.ts` reads the page's language from the request headers **without waiting**, using Next.js's temporary compatibility cast (`UnsafeUnwrappedHeaders`). It is marked `TRANSITIONAL` in the code. The reason: `tr()` and `lp()` (translate a sentence, build a link in the page's language) are called, without `await`, from almost every server component. Making them asynchronous means changing hundreds of call sites.

- **Next.js 15 allows this** (it warns in development only).
- **Next.js 16 removes it.** Before upgrading to 16, resolve the language once per page instead: `const locale = await getLocale()` at the top of each page and layout, and pass it down (or to `tr`/`lp`).
- A test (`tests/next15_test.tsx`) fails if a second synchronous header read appears anywhere, so the debt cannot grow quietly.

## Before you deploy
1. **Node on Netlify.** Next.js 15 needs Node 18.18 or newer. Set the `NODE_VERSION` environment variable to `20` in Netlify (Site configuration, Environment variables) and confirm the deploy log shows it. CI already uses Node 20.
2. **Use a deploy preview first.** Open the pull request, let Netlify build the preview, and click through: the home page, `/map` (pins, filters, choosing a pin), a stay and an experience page, a story, a language switch, sign-in and the admin area, the contact form, and one booking or ticket flow if you have test data.
3. **Watch the function logs** for the first day. You should not see warnings about `headers()` needing `await`, except possibly from the language helper in development only.

## Caching defaults changed in Next.js 15 (nothing to do, but good to know)
Next.js 14 could cache a `GET` route handler, and a server `fetch`, by default. Next.js 15 does not. In this site all but one of the 15 `GET` routes read the request, the session or the database, so they were never cacheable. The exception is the Taita Guide's "is the AI on?" check (`/api/concierge/capabilities`), which reads a setting: it is now evaluated on each request, which is more correct (switching the setting on no longer needs a rebuild). The server `fetch` calls are all to email and payment providers and must not be cached. If you ever add a `GET` route that should be cached, mark it `export const dynamic = "force-static"`.

## If something goes wrong: rolling back
- On Netlify, restore the previous deploy (Deploys, then "Publish deploy" on the last good one): this is instant and needs no code change.
- In the repository, revert the pull request. The dependency changes are in their own commit, so you can also revert only the code commits.

## Keeping the test suite valid
The upgrade changes how React writes HTML (it adds preload hints for pictures, writes attributes in the order a component gives them, and adds a tiny script when a page has a form). About a dozen tests in `tests/` read the page too literally for that, so the upgrade makes them read it the way a browser does: they look only at links people can click, ignore script text, and read attributes by name in any order. These edits are safe on the old version too. `tests/next15_test.tsx` is new: it checks the versions, that every use of `headers()`/`cookies()` is awaited, that route parameters are Promises, that no migration leftovers remain, and that there is only one synchronous read.
