# The admin area: shell and overview

**The shell** (`components/admin/AdminShell.tsx`, used by `app/admin/layout.tsx`) is everything around an admin page: a slim dark **bar**, the **menu** column, the **trail**, and the page. The public site's header, footer, "Ask Taita" helper and language banner are not shown on admin pages (`components/HideOnAdmin.tsx`, wired in `app/layout.tsx`; `lib/admin-path.ts` says what counts as an admin page).

- **The bar** (`AdminBar.tsx`): the logo and "Admin", **Find a page** (`AdminFind.tsx`; press **Ctrl K** or **Cmd K** from anywhere), "View site" (opens the public site in a new tab), the **bell** (how many things are waiting for *you*; it links to "Needs your attention"), and your account. On a phone the menu button sits at the left and the search drops to its own row.
- **Find a page** only offers pages this person may open, and matches names, section names and the extra keywords in `lib/admin-nav.ts`. Enter goes to the first match; the arrow keys move through the results; Escape clears it.
- **The menu** (`AdminNav.tsx`): an icon for each section, folding sections, the current page in a neutral tone (rust is kept for "something is waiting"), and small counts on sections and pages where something is waiting (each reads aloud as, for example, "7 waiting in this section"). The section that holds the current page is always open. To add an admin page, add it to `lib/admin-nav.ts` (a test fails if you forget).
- **Colours** are the `admin` group in `tailwind.config.ts` (a cooler, quieter ground, white cards, clearer borders). The text colours meet WCAG AA; `tests/admin_shell_test.tsx` measures it.

**The overview** (`app/admin/page.tsx`):

- **Needs your attention**: one row for each kind of thing waiting (the wording and links are `ATTENTION` in `lib/admin-nav.ts`), or "All caught up". Money items (refunds, host payouts) are only for admins.
- **Before launch**: the **sample content still published** (computed from the database: `lib/admin-launch.ts` counts rows flagged as sample data with status PUBLISHED, for each kind of content). It disappears by itself once there is none. To count another kind of content, it needs both a sample flag and a published status; a test checks this against the schema.
- **Quick actions**: make something new (buttons) and, for admins, look after accounts (links).
- **At a glance**: the counts, in panels, each row a link; a zero is drawn quieter.
- The two security alerts (the demo account still has its published password; only one active super admin) sit at the top, above the cards.

**Tests:** `admin_shell_test` (the shell's logic, the launch list, the colours and contrast), `admin_ui_test` (the menu, the search and the phone menu, in a browser), `admin_pages_test` (the layout and overview), `admin_nav_test` (the menu's data).
