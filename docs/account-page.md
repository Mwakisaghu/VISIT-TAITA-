# The account page ("Your Taita")

`/account` is where a signed-in person sees everything that is theirs. It is built to be used for a task (check a booking, find a ticket, change a setting), not browsed, so it opens with what is happening and gives every part of the account one consistent card.

## What is on it, top to bottom
1. **The cover:** a greeting ("Karibu, Daniel." for someone who joined in the last 36 hours, "Karibu tena, Neema." after), when they joined, whether their email is verified, and any role they hold (host, seller, event manager, creator, team). Beside it, the **Passport card**: their stamps plotted on Taita's own altitude line (the same 400 to 2,300 m scale and 900 m / 1,400 m zones as the Field Guide), and the next saved place to stamp.
2. **Needs your attention** (only when something does): verify your email, a failed shop payment, booking requests waiting for a host, a payout being prepared.
3. **Coming up:** the next booking, the next tickets and the open order, each with a status chip and its next action. With nothing booked it explains why it is empty and offers one next step.
4. **Your work** (only for people with a role): the host, seller, events, creator or admin cards, kept apart from the person's own life as a visitor.
5. **Everything in your account:** nine cards (Passport, Bookings, Tickets, Orders, Day plans, Want to go, Enquiries, Reviews and Field Notes, Rewards). Every card has an icon, a name and a live status, so none is overlooked. On a wide screen the same list is a side rail.
6. **Settings:** your details, sign-in and security, language and notifications, privacy and your data (what we hold, download, delete). On a phone each is a tappable row; on a wide screen they are open cards. `#security`, `#privacy` and so on open the right section.
7. **Need a hand?** The same place on every page. The WhatsApp button appears only when `WHATSAPP_NUMBER` is set.

Three small list pages sit behind the cards that had no page before: `/account/orders`, `/account/enquiries` and `/account/reviews`.

## Where things live
- `lib/account-hub-rules.ts`: pure rules (the altitude line, what counts as upcoming, order states, dates in each language, who sees which work card). Unit-tested on its own.
- `lib/account-hub.ts`: the one place that reads the database for this page. Every query is scoped to the person (a test checks that).
- `lib/account-hub-text.ts`: what each card says and where it links. Every sentence goes through `tr()`; a count has a separate sentence for 1 and for more, because languages change the noun differently.
- `components/account-hub/`: the page's pieces. `app/account/`: the page and its three lists.

## Adding or changing a card
Add it in `tiles()` in `lib/account-hub-text.ts` (icon, title, status, link), give it a count in `lib/account-hub.ts` if it needs one, add its texts to the three dictionaries, and run `node scripts/i18n-keys.mjs --check`. The tests fail if a card has no icon, a text has no translation, or a query is not scoped to the person.

## Language
The page is in English, Kiswahili, Français and Deutsch. The translations were drafted for Visit Taita and **must be read by a native speaker before launch** (like the rest). French says "vous", German "du". Server messages that come back from forms (for example a wrong password when deleting an account) and the reasons an account cannot yet be deleted are still English.

## Your name, your password, and signing out everywhere
- **Name:** "Edit" turns the name into a small form. The browser checks it first (2 to 80 characters, no `@`, no angle brackets, no invisible characters) and the server checks it again; the page refreshes when it is saved.
- **Password:** needs the **current** password (a stolen session alone cannot change it). Every attempt, right or wrong, counts toward 5 an hour, and the current password is checked *before* anything about the new one is revealed. The new one follows the same rule as sign-up (10 or more characters, not a common password, not containing your name or email). On success every sign-in ends (this one too), reset links still waiting are cancelled, and the owner is emailed.
- **Sign out everywhere:** asks once ("including this one?"), then records the moment on your account; every sign-in that began before it ends. Other devices drop within about five minutes (staff within one), because that is how often a sign-in is rechecked.
- **Errors are codes, not English sentences:** the actions (`lib/actions/account-security.ts`) return a code and the page says it in the person's language. The password rule's messages are in `lib/password-policy-text.ts`.
- The password and sign-out forms use the right `autocomplete` values, so password managers work, and pasting is never blocked.

## Not on it yet
Changing your email address (it needs a verification flow) and two-step sign-in. Until then, an email change goes through "Contact us".
