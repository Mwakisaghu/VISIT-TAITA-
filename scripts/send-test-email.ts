// Sends one test email so you can confirm RESEND_API_KEY / EMAIL_FROM work
// before relying on lead and enquiry notifications.
//
// Run with:  npm run email:test -- you@example.com
// (with no argument it sends to NOTIFY_EMAIL)
//
// Note: with the shared sender onboarding@resend.dev, Resend only delivers to
// the address your Resend account was created with.

import "dotenv/config";
import { parseRecipients, sendEmail } from "../lib/email";

async function main() {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    console.error("Set RESEND_API_KEY and EMAIL_FROM in your .env first.");
    process.exit(1);
  }

  const to = parseRecipients(process.argv[2] ?? process.env.NOTIFY_EMAIL);
  if (to.length === 0) {
    console.error("No valid recipient. Pass one: npm run email:test -- you@example.com (or set NOTIFY_EMAIL).");
    process.exit(1);
  }

  const result = await sendEmail({
    to,
    subject: "Visit Taita — test email",
    text: "If you can read this, Visit Taita email notifications are configured correctly.",
  });

  if (result.ok) {
    console.log(`Sent to ${to.join(", ")}. Check the inbox (and spam).`);
  } else {
    console.error(`Failed: ${result.error}. See the [email] line above for the provider's reason.`);
    process.exit(1);
  }
}

main();
