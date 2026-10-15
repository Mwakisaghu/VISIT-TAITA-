# Security headers and the Content-Security-Policy

Every page is sent with these headers (see `next.config.js`): the browser must not guess file types, the site cannot be framed by others, a short referrer, camera and microphone off, and HTTPS only (HSTS).

## The Content-Security-Policy (CSP)
A CSP tells the browser what a page may load and from where, so that if someone ever managed to inject a script into a page, the browser would refuse to run it. It is powerful, and a wrong one can break things silently, so it starts in **report-only** mode: the browser tells the site what it *would* have blocked, and blocks nothing.

### What it says
- By default, only the site's own files.
- Pictures from the site, `data:` and `blob:` addresses, and any `https` address (your storage, stock photos, the map tiles and the map's marker image).
- Scripts and styles from the site, plus the small inline ones the framework writes into every page.
- No plugins, no embedding other sites, the site cannot be framed by others, forms only to the site.

### Watching it for a week
Violation reports arrive at `/api/csp-report`, which keeps only the rule, the kind of thing that was blocked and the page path (never a person, a query string or a browser). In the hosting provider's function logs, look for lines beginning `[csp]`.
- **No `[csp]` lines for a week of normal use:** switch it on.
- **Some lines:** each one names something a page tried to load. If it is something you want (a new map style, an embed), add its address to the policy in `next.config.js` and update the test in `csp_test`. If you do not recognise it, treat it as a warning and investigate.

### Switching it on
Set `CSP_ENFORCE=1` in the hosting settings and redeploy. The same policy now blocks instead of reporting. Keep watching the logs for a few days. To go back, remove the setting.

### Things to know
- Inline scripts must stay allowed because the framework writes them. A stricter policy using "nonces" is possible later.
- The map no longer loads anything from `unpkg.com` (its pins are drawn by the site itself). The only outside address a page loads for the map is the OpenStreetMap tiles.
- A new outside script, stylesheet or embed needs a change to the policy on purpose. A test checks that the code does not load any today.
