// Lists every piece of text that is marked for translation, or checks that every language has them all.
//   node scripts/i18n-keys.mjs           lists them
//   node scripts/i18n-keys.mjs --check   fails if a language is missing one, or has one that no page uses
// A piece of text is marked by writing tr("..."), T("...") (in a list) or say("...") (in the language banner).
import fs from "node:fs";
import path from "node:path";

export const SOURCES = ["app/two-step", "components/auth", "app/login", "app/register", "components/account/ResetPasswordForm.tsx", "components/home", "components/Nav.tsx", "components/Footer.tsx", "components/i18n", "components/concierge", "components/share", "lib/concierge.ts", "lib/scroll-rail.ts", "app/essentials", "components/stories/StoryCredits.tsx", "app/error.tsx", "app/not-found.tsx", "app/account", "components/account-hub", "components/passport/book", "app/passport/page.tsx", "lib/account-hub-text.ts", "lib/password-policy-text.ts", "components/account/DeleteAccountForm.tsx", "components/account/ResendVerificationButton.tsx", "components/account/UnsubscribeButton.tsx"];
export const EXTRA = ["More than a place.", "A destination culture, told by the people who live it."]; // brand lines that are passed in as values
function files(p) { if (!fs.existsSync(p)) return []; const st = fs.statSync(p); if (st.isFile()) return [p]; return fs.readdirSync(p).flatMap((n) => files(path.join(p, n))).filter((f) => /\.(tsx|ts)$/.test(f)); }
export function collect(root = ".") {
  const keys = new Set(EXTRA); const re = /\b(?:tr|T|say)\(\s*("(?:[^"\\\n]|\\.)*")/g;
  for (const s of SOURCES) for (const f of files(path.join(root, s))) { const src = fs.readFileSync(f, "utf8"); for (const m of src.matchAll(re)) { try { keys.add(JSON.parse(m[1])); } catch { /* not a plain string */ } } }
  return [...keys].sort((a, b) => a.localeCompare(b));
}
/** Compares the marked texts with each language's dictionary: what is missing, and what nothing uses any more. */
export function check(root = ".") {
  const keys = collect(root); const out = {};
  for (const l of ["sw", "fr", "de"]) {
    const file = path.join(root, "lib/i18n/messages", `${l}.ts`); const have = new Set();
    for (const m of fs.readFileSync(file, "utf8").matchAll(/^  ("(?:[^"\\]|\\.)*"): ("(?:[^"\\]|\\.)*"),$/gm)) { try { have.add(JSON.parse(m[1])); } catch { /* skip */ } }
    out[l] = { missing: keys.filter((k) => !have.has(k)), unused: [...have].filter((k) => !keys.includes(k)) };
  }
  return out;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes("--check")) {
    const r = check(); let bad = 0;
    for (const [l, v] of Object.entries(r)) { if (v.missing.length) { bad++; console.error(`${l}: ${v.missing.length} text(s) have no translation (they show in English):\n  ` + v.missing.join("\n  ")); } if (v.unused.length) { bad++; console.error(`${l}: ${v.unused.length} translation(s) that no page uses:\n  ` + v.unused.join("\n  ")); } }
    if (bad) process.exit(1); console.log("Every marked text has a translation in every language, and none is unused.");
  } else { const k = collect(); console.log(k.join("\n")); console.error(`\n${k.length} texts`); }
}
