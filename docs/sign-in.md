# Sign-in, sign-up and passwords

## What a person sees
- **Sign in** and **Create account** share a frame: a green panel with the Passport emblem and ridge line beside the form (a slim banner on a phone). Every text is in English, Kiswahili, Français and Deutsch.
- **The eye** in every password box shows what you typed (so there is no "type it again" box). From the keyboard it keeps focus on the button, so Space or Enter toggles it back. **Caps Lock** is flagged.
- **The checklist** under a new password ticks four plain lines as you type. They are exactly the rules the server applies (`passwordChecks` in `lib/password-policy.ts`), and they never ask for symbols or capitals.
- **"Suggest a passphrase"** makes random words on the person's own device, in a language they choose (English: 4 words; Kiswahili: 6, so both reach at least 50 bits). Any password in any language is accepted; this only helps people who want to be given one.
- After sign-up a **"Karibu" stamp** lands (the same one the Passport starts with), then "Open my Passport".

## Your browser's own strong-password suggestion
A website cannot switch Chrome's or Safari's suggestion on. They decide from the form. What we control is the hints: `username` on the email, `current-password` when signing in, `new-password` when choosing one, Safari's `passwordrules`, and **no length limit** on any password box. All of that is tested.

## Passwords in any language
- A password is put into one canonical Unicode form (NFKC) and reduced to a fixed-size SHA-256 digest **before** bcrypt (`lib/password.ts`). So an accented letter typed on a different phone gives the same password, and there is no 72-byte limit (which gave Amharic, Arabic or Chinese only about a third of the length English got). NIST SP 800-63B recommends accepting Unicode and normalising it.
- Length counts characters, not bytes: 10 to 128. Names are compared in any script (a 2-character floor for Chinese, Japanese and Korean, 4 elsewhere).
- Hashes made this way start with `v2$`. Older ones still work and are upgraded at the owner's next successful sign-in. **Rolling the code back past this change would make upgraded passwords unverifiable**; a password reset still works.
- A password found in a known breach (Pwned Passwords, by 5-character prefix only; the password never leaves the server) is refused at sign-up, reset and change. If that service is down the password is accepted.

## Adding a mother tongue to the passphrase suggester
1. Add `lib/wordlists/<code>.ts` exporting `WORDS`: plain words of one language, at least 600, letters only (no hyphens, apostrophes or digits), each 3 to 9 letters, no duplicates.
2. Add one line to `lib/wordlists/index.ts`.
The tests check every list automatically. The suggester picks how many words it needs for the strength.
**The Kiswahili list is a draft and needs a native speaker's review** (spelling, and that no word is rude). The English list is the EFF Large Wordlist (CC BY 3.0 US), credited in its file.

## Known limits
- Sign-up still says when an email already has an account (`409`). Sign-in does not. Hiding it would change the sign-up flow (it would have to email the owner instead); it is rate-limited per connection.
- The server messages for the reset link (expired, used) are still English.
- Two-step sign-in is the next step (authenticator app, recovery codes, staff enforcement).
