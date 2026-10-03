import { isValidEmail, parseRecipients, sendEmail } from "@/lib/email";

// Who gets told what:
//  - The team inbox (NOTIFY_EMAIL, comma-separated) hears about every sponsor
//    lead and every stay/experience enquiry, with an admin link.
//  - A listing's own contactEmail ALSO hears about enquiries for that listing
//    — except for demo listings (their addresses are placeholders).
//  - Submitters are NOT emailed a confirmation: that would let anyone use the
//    public forms to send mail to a third party's address.
// Every function here swallows its own errors.

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "").replace(/\/+$/, "");
}

function adminLink(path: string) {
  const base = appUrl();
  return base ? `${base}${path}` : path;
}

function day(d: Date | null | undefined) {
  return d ? d.toISOString().slice(0, 10) : null;
}

function details(rows: [string, string | number | null | undefined][]) {
  return rows
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
    .map(([label, v]) => `${label}: ${v}`)
    .join("\n");
}

// ---------------------------------------------------------------------------
// Sponsor leads
// ---------------------------------------------------------------------------

export async function notifySponsorLead(
  lead: {
    id: string;
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
    website: string | null;
    budgetRange: string | null;
    message: string;
  },
  packageName: string | null
) {
  try {
    const team = parseRecipients(process.env.NOTIFY_EMAIL);
    if (team.length === 0) return;

    const text = [
      "A new sponsorship enquiry has come in.",
      "",
      details([
        ["Company", lead.companyName],
        ["Contact", lead.contactName],
        ["Email", lead.email],
        ["Phone", lead.phone],
        ["Website", lead.website],
        ["Package", packageName],
        ["Budget", lead.budgetRange],
      ]),
      "",
      "Message:",
      lead.message,
      "",
      `Open in admin: ${adminLink(`/admin/sponsors/leads/${lead.id}`)}`,
    ].join("\n");

    await sendEmail({
      to: team,
      subject: `New sponsor lead: ${lead.companyName}`,
      text,
      replyTo: lead.email,
    });
  } catch (err) {
    console.error("[notify] sponsor lead notification failed", err);
  }
}

// ---------------------------------------------------------------------------
// Stay / experience enquiries
// ---------------------------------------------------------------------------

type Listing = { name: string; isDemo: boolean; contactEmail: string | null };

async function sendEnquiryEmails(opts: {
  kind: "stay" | "experience";
  listing: Listing;
  enquirerEmail: string;
  summaryRows: [string, string | number | null | undefined][];
  message: string;
  adminPath: string;
}) {
  const { kind, listing, enquirerEmail, summaryRows, message, adminPath } = opts;
  const team = parseRecipients(process.env.NOTIFY_EMAIL);
  const hostEmail =
    !listing.isDemo && listing.contactEmail && isValidEmail(listing.contactEmail.trim().toLowerCase())
      ? listing.contactEmail.trim().toLowerCase()
      : null;

  const body = (intro: string, footer: string) =>
    [intro, "", details(summaryRows), "", "Message:", message, "", footer].join("\n");

  const jobs: Promise<unknown>[] = [];

  if (team.length > 0) {
    jobs.push(
      sendEmail({
        to: team,
        subject: `New ${kind} enquiry: ${listing.name}`,
        text: body(
          `A new ${kind} enquiry has come in for ${listing.name}.`,
          `Open in admin: ${adminLink(adminPath)}`
        ),
        replyTo: enquirerEmail,
      })
    );
  }

  // Separate message to the host so neither side sees the other's addresses.
  if (hostEmail && !team.includes(hostEmail)) {
    jobs.push(
      sendEmail({
        to: hostEmail,
        subject: `Enquiry for ${listing.name} via Visit Taita`,
        text: body(
          `Someone has enquired about ${listing.name} through Visit Taita. Reply to this email to reach them directly.`,
          "Sent by Visit Taita on behalf of the enquirer."
        ),
        replyTo: enquirerEmail,
      })
    );
  }

  await Promise.allSettled(jobs);
}

export async function notifyAccommodationEnquiry(
  e: {
    id: string;
    name: string;
    email: string;
    phone: string;
    checkIn: Date | null;
    checkOut: Date | null;
    guests: number | null;
    message: string;
  },
  listing: Listing
) {
  try {
    await sendEnquiryEmails({
      kind: "stay",
      listing,
      enquirerEmail: e.email,
      summaryRows: [
        ["Name", e.name],
        ["Email", e.email],
        ["Phone", e.phone],
        ["Check-in", day(e.checkIn)],
        ["Check-out", day(e.checkOut)],
        ["Guests", e.guests],
      ],
      message: e.message,
      adminPath: "/admin/accommodations/enquiries",
    });
  } catch (err) {
    console.error("[notify] stay enquiry notification failed", err);
  }
}

export async function notifyExperienceEnquiry(
  e: {
    id: string;
    name: string;
    email: string;
    phone: string;
    preferredDate: Date | null;
    partySize: number | null;
    message: string;
  },
  listing: Listing
) {
  try {
    await sendEnquiryEmails({
      kind: "experience",
      listing,
      enquirerEmail: e.email,
      summaryRows: [
        ["Name", e.name],
        ["Email", e.email],
        ["Phone", e.phone],
        ["Preferred date", day(e.preferredDate)],
        ["Party size", e.partySize],
      ],
      message: e.message,
      adminPath: "/admin/experiences/enquiries",
    });
  } catch (err) {
    console.error("[notify] experience enquiry notification failed", err);
  }
}
