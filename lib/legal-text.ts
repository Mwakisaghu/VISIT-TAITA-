// The text of the Privacy Policy and Terms of Use, as plain data so it is easy to test and to change.
// IMPORTANT: this is a plain-language DRAFT written against what the application actually does. It has NOT been
// reviewed by a lawyer. The pages display a "draft" notice until LEGAL_REVIEWED_ON is set. Whenever the product
// changes what it collects or shares, update this text and bump LEGAL_VERSION in lib/site-info.ts.
//
// Inline syntax: [text](/internal/path) makes a link, **text** is bold.

import { controllerName, orPlaceholder, type SiteInfo } from "@/lib/site-info";

export type LegalBlock = string | { list: string[] };
export type LegalSection = { id: string; title: string; body: LegalBlock[] };

export function privacySections(info: SiteInfo): LegalSection[] {
  const who = controllerName(info);
  return [
    {
      id: "who-we-are",
      title: "Who we are",
      body: [
        "Visit Taita is a platform about Taita Taveta, Kenya: destinations, stories, events, places to stay, experiences, the Taita Passport, a shop and a crew of creators. This policy explains what personal data we collect, why, who sees it, how long we keep it and what choices you have.",
        `The organisation responsible for your data (the "data controller") is **${who}** ("Visit Taita", "we", "us").`,
        { list: [
          `Privacy contact: ${orPlaceholder(info.privacyEmail)}`,
          `Postal address: ${orPlaceholder(info.address)}`,
          `Registration with Kenya's Office of the Data Protection Commissioner: ${orPlaceholder(info.odpcRegistration)}`,
        ] },
      ],
    },
    {
      id: "what-we-collect",
      title: "What we collect and why",
      body: [
        "We collect only what each part of the site needs. Here is what, by what you are doing:",
        { list: [
          "**Your account:** your name, email address and a password. The password is stored only as a one-way hash, so we cannot read it. We use these to create your account and sign you in.",
          "**The Taita Passport:** the places you check in at, when, and how (QR code, location, or marked by you), the points you earn, rewards and vouchers you claim, and badges. We use this to run the Passport and its rewards.",
          "**Enquiries about stays and experiences:** your name, email, phone number, message and any dates or party size. We share these with the host of that listing and with our team so they can reply to you. If you reached the listing from a mission or a Field Note, we also record which one, so hosts and sponsors can see what a mission led to.",
          "**Reviews:** your rating and text. They are shown publicly with your first name and last initial. A review can show as \"verified\" if you made a confirmed enquiry with that host.",
          "**Shop orders:** your name and email (from your account), phone number, delivery address, what you ordered, and the payment status and reference numbers from M-Pesa or Pesapal. We do not receive or store your card details or M-Pesa PIN.",
          "**The Field Crew (creators):** if you apply, the details in your application and any profile or Field Notes you publish. An audience-size note, if you add one, is seen only by our team.",
          "**The newsletter:** your email address. We email you a link to confirm before sending anything. If you unsubscribe we keep the address on a do-not-email list so we never email you again; deleting your account removes it.",
          "**Sponsor and partner enquiries and applications:** the contact and business details you give us.",
          "**Contact messages:** your name, email and message, used only to reply to you.",
          "**Email delivery records:** the recipient, subject and delivery status of emails we send, so we can retry failures. The message text is cleared once the email is delivered, and after 7 days if it never is. The records themselves are deleted after 30 days.",
        ] },
      ],
    },
    {
      id: "location",
      title: "Your location",
      body: [
        "If you tap \"Check in here\" on the Passport, your browser asks permission to use your device's location. We use it once, at that moment, only to check that you are near the place. **We do not store your coordinates** — we record only that a check-in happened and when. You can say no, and use the QR code at the place instead.",
      ],
    },
    {
      id: "cookies",
      title: "Cookies and similar technologies",
      body: [
        "We use only the cookies needed to keep you signed in. We do not use advertising or tracking cookies.",
        "To understand which stories and missions people read, we count page views per page per day, from your browser, without recording who you are. We use your internet address only briefly, in memory, to limit abuse (for example repeated form submissions); we do not store it in our database.",
      ],
    },
    {
      id: "sharing",
      title: "Who we share it with",
      body: [
        "We do not sell your personal data. We share it only as follows:",
        { list: [
          "**Hosts and partners** receive the details of enquiries made about their own listings.",
          "**Sponsors** receive only totals (for example how many people viewed a mission). Never your personal details.",
          "**Service providers** who help us run the site: our database (Neon), email delivery (Resend), and payment processing (Safaricom M-Pesa and Pesapal). They may only use your data to provide their service to us.",
          "**Authorities**, where the law requires it.",
        ] },
      ],
    },
    {
      id: "transfers",
      title: "Where your data is processed",
      body: [
        "Some of our service providers process data outside Kenya. For example, our database is hosted in the United States. Where data leaves Kenya we rely on our providers' contractual and security commitments.",
      ],
    },
    {
      id: "retention",
      title: "How long we keep it",
      body: [
        { list: [
          "**Your account and Passport:** until you delete your account.",
          "**Enquiries, reviews and creator content:** while your account exists, and enquiries for as long as needed to deal with them and keep our records. You can ask us to remove them.",
          "**Shop orders:** we keep a record of each order and its payment, with your phone number and address removed if you delete your account, because we may need payment records for accounting and legal reasons.",
          "**Email delivery records:** as described above — message text is not kept after delivery.",
        ] },
      ],
    },
    {
      id: "your-rights",
      title: "Your rights and choices",
      body: [
        "You can ask what we hold about you, have mistakes corrected, have your data deleted, object to how we use it, and receive a copy in a common format.",
        { list: [
          "**See and download your data:** sign in and use \"Download my data\" on your [account page](/account).",
          "**Delete your account:** use \"Delete my account\" on the same page. It removes your account and Passport, your reviews, and your creator profile and Field Notes. Your enquiries are kept only as anonymous records. Some things cannot be deleted in one click — for example if you have an order in progress or manage listings — and the page tells you why.",
          "**Stop the newsletter:** unsubscribe from your account page or contact us. Every newsletter will include an unsubscribe link.",
          "**Anything else, or data not linked to an account** (for example an enquiry sent without signing in): [contact us](/contact) and we may need to confirm who you are first.",
        ] },
        "If you are unhappy with how we handle your data, you can complain to the Office of the Data Protection Commissioner in Kenya. We would like the chance to put it right first.",
      ],
    },
    {
      id: "children",
      title: "Children",
      body: ["Visit Taita is not intended for people under 18 and we do not knowingly collect their data. If you think a child has given us personal data, contact us and we will delete it."],
    },
    {
      id: "security",
      title: "Security",
      body: ["We protect your data with measures such as hashed passwords, access controls and limits on who can see what. No system is perfectly secure, so we cannot guarantee absolute security."],
    },
    {
      id: "changes",
      title: "Changes to this policy",
      body: ["We will update this policy when what we do with data changes. The version and date are shown at the top of this page, and we will tell account holders about important changes."],
    },
    {
      id: "contact",
      title: "Contact us",
      body: [`Questions or requests about your data: ${orPlaceholder(info.privacyEmail)}, or use our [contact page](/contact).`],
    },
  ];
}

export function termsSections(info: SiteInfo): LegalSection[] {
  const who = controllerName(info);
  return [
    {
      id: "agreement",
      title: "Our agreement",
      body: [
        `These terms are between you and **${who}** ("Visit Taita", "we", "us") and apply when you use this website. By creating an account or using the site you agree to them. Please also read our [Privacy Policy](/privacy), which explains how we handle your data.`,
      ],
    },
    {
      id: "accounts",
      title: "Your account",
      body: [
        { list: [
          "You must be 18 or over to create an account.",
          "Give accurate information and keep your password safe. You are responsible for what happens under your account.",
          "One person, one account. Do not share your account or use someone else's.",
          "You can delete your account at any time from your [account page](/account).",
        ] },
      ],
    },
    {
      id: "using-the-site",
      title: "Using the site",
      body: [
        "Use Visit Taita lawfully and considerately. Do not:",
        { list: [
          "break the law, or post anything unlawful, abusive, misleading or that infringes someone's rights;",
          "interfere with the site, probe it for weaknesses, or use bots or scraping to take content or to inflate numbers such as views, points or check-ins;",
          "pretend to be someone else, or check in at a place you are not at.",
        ] },
        "We may suspend or remove accounts and content that break these terms.",
      ],
    },
    {
      id: "stays-and-experiences",
      title: "Stays, experiences and enquiries",
      body: [
        "Visit Taita introduces you to hosts, guides and other operators. They are independent businesses, not part of Visit Taita. When you send an enquiry we pass your details to them. Any booking, price, service or payment is an agreement between you and them.",
        "We try to keep listings accurate but do not guarantee availability, prices or quality, and we are not responsible for what a host or operator does or does not do.",
      ],
    },
    {
      id: "shop",
      title: "The shop",
      body: [
        "Prices are in Kenyan shillings. You can pay with M-Pesa or Pesapal, as shown at checkout. An order is confirmed when payment succeeds or when we confirm it. Delivery, collection and returns are as described at checkout and on the product.",
        "Items are sold by the seller named on the product. Your phone number and delivery address are shared with them to fulfil the order.",
      ],
    },
    {
      id: "reviews-and-content",
      title: "Reviews and content you add",
      body: [
        "Reviews, creator profiles and Field Notes must be honest and based on your own experience. You keep ownership of what you write. By submitting it you give us a non-exclusive licence to display it on Visit Taita and our channels, with credit to you where it applies, for as long as it is on the site. We review content and may decline, edit the display of, or remove it.",
        "If a stay, meal, product or payment was given to you in return for content, you must say so clearly in that content.",
      ],
    },
    {
      id: "field-crew",
      title: "The Field Crew",
      body: [
        "If you join the Field Crew, the creator guidelines you accepted also apply: show real evidence, only write about places you have been, always disclose anything hosted, gifted or sponsored, and respect people and places. Missions and Field Notes may be reviewed, hidden or removed, and a profile may be paused, if the guidelines are broken.",
      ],
    },
    {
      id: "passport",
      title: "Passport points and rewards",
      body: [
        "Points and vouchers have no cash value and cannot be transferred. Rewards are offered by partners and are subject to their availability and any stated conditions or expiry. We may cancel points or vouchers obtained by cheating or misuse.",
      ],
    },
    {
      id: "ip",
      title: "Our content",
      body: ["The site's design, text, photographs and software belong to Visit Taita or are used with permission. You may view and share links to pages for personal use, but may not copy or reuse them commercially without our written permission."],
    },
    {
      id: "liability",
      title: "Our responsibility",
      body: [
        "We provide the site \"as is\" and work to keep it available and accurate, but we cannot promise it will always be error-free or uninterrupted. To the extent the law allows, we are not liable for indirect or consequential loss, or for the acts of hosts, operators, sellers or other users. Nothing in these terms limits liability that cannot lawfully be limited.",
      ],
    },
    {
      id: "changes",
      title: "Changes and ending",
      body: [
        "We may update these terms; the version and date are shown above and we will tell account holders about important changes. You can stop using the site and delete your account at any time. We may suspend or end access for serious or repeated breaches.",
      ],
    },
    {
      id: "law",
      title: "Governing law and contact",
      body: [
        "These terms are governed by the laws of Kenya, and the courts of Kenya have jurisdiction, unless the law says otherwise.",
        `Questions: ${orPlaceholder(info.contactEmail)}, or use our [contact page](/contact).`,
      ],
    },
  ];
}
