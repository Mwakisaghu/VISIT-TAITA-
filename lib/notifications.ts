import { isValidEmail, parseRecipients, sendEmail } from "@/lib/email";
import { starString } from "@/lib/reviews";
import { holderLabel } from "@/lib/voucher-lookup";

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

// ---------------------------------------------------------------------------
// Rewards: a voucher was redeemed
// ---------------------------------------------------------------------------
// Routed by who honours the reward: the partner assigned to it hears about it;
// a staff-run reward goes to the team inbox instead. The holder appears as
// first name + last initial only, and the visitor's email is never included.
// Never throws.

export async function notifyVoucherRedeemed(v: {
  code: string;
  rewardName: string;
  holderName: string | null;
  ownerEmail: string | null;
}) {
  try {
    const holder = holderLabel(v.holderName);
    const partner = v.ownerEmail ? v.ownerEmail.trim().toLowerCase() : "";

    if (partner && isValidEmail(partner)) {
      await sendEmail({
        to: partner,
        subject: `New voucher to honour: ${v.rewardName}`,
        text: [
          "A visitor has redeemed one of your rewards through Visit Taita.",
          "",
          details([
            ["Reward", v.rewardName],
            ["Voucher code", v.code],
            ["Holder", holder],
          ]),
          "",
          "When they show you the code, check it and mark it used here:",
          adminLink("/partner/vouchers"),
        ].join("\n"),
      });
      return;
    }

    const team = parseRecipients(process.env.NOTIFY_EMAIL);
    if (team.length === 0) return;
    await sendEmail({
      to: team,
      subject: `Voucher redeemed (staff to honour): ${v.rewardName}`,
      text: [
        "A visitor redeemed a reward that has no partner assigned, so staff need to honour it.",
        "",
        details([
          ["Reward", v.rewardName],
          ["Voucher code", v.code],
          ["Holder", holder],
        ]),
        "",
        `Open in admin: ${adminLink(`/admin/rewards/redemptions?code=${encodeURIComponent(v.code)}`)}`,
      ].join("\n"),
    });
  } catch (err) {
    console.error("[notify] voucher notification failed", err);
  }
}

// ---------------------------------------------------------------------------
// Reviews: one is waiting for approval
// ---------------------------------------------------------------------------
// Goes to the team inbox only. The reviewer appears as first name + last
// initial and their email is never included. Never throws.

export async function notifyNewReview(r: {
  kind: "accommodation" | "experience";
  listingName: string;
  rating: number;
  title: string | null;
  body: string;
  verified: boolean;
  reviewerName: string | null;
  edited: boolean;
}) {
  try {
    const team = parseRecipients(process.env.NOTIFY_EMAIL);
    if (team.length === 0) return;

    const excerpt = r.body.length > 300 ? `${r.body.slice(0, 300).trimEnd()}…` : r.body;
    const text = [
      `${r.edited ? "A review was edited and" : "A new review"} is waiting for approval.`,
      "",
      details([
        ["Listing", r.listingName],
        ["Type", r.kind === "accommodation" ? "Stay" : "Experience"],
        ["Rating", `${starString(r.rating)} (${r.rating}/5)`],
        ["Reviewer", holderLabel(r.reviewerName)],
        ["Verified guest", r.verified ? "Yes — confirmed enquiry" : "No"],
        ["Headline", r.title],
      ]),
      "",
      "Review:",
      excerpt,
      "",
      `Moderate it: ${adminLink("/admin/reviews")}`,
    ].join("\n");

    await sendEmail({
      to: team,
      subject: `${r.edited ? "Edited" : "New"} review to approve: ${r.listingName} (${r.rating}★)`,
      text,
    });
  } catch (err) {
    console.error("[notify] review notification failed", err);
  }
}

// ---------------------------------------------------------------------------
// Field Crew: applications and decisions
// ---------------------------------------------------------------------------
// A new application goes to the team inbox. A decision goes to the applicant's own
// account email (never to an address typed into a public form). Never throws.

export async function notifyCreatorApplication(a: {
  track: string;
  displayName: string;
  specialties: string[];
  location: string | null;
  linkCount: number;
  pitch: string;
}) {
  try {
    const team = parseRecipients(process.env.NOTIFY_EMAIL);
    if (team.length === 0) return;
    const pitch = a.pitch.length > 300 ? `${a.pitch.slice(0, 300).trimEnd()}…` : a.pitch;
    await sendEmail({
      to: team,
      subject: `New Field Crew application: ${a.displayName}`,
      text: [
        "Someone has applied to join the Taita Field Crew.",
        "",
        details([
          ["Name", a.displayName],
          ["Track", a.track === "LOCAL_VOICE" ? "Local Voice" : "Visiting Creator"],
          ["Creates", a.specialties.join(", ")],
          ["Based in", a.location],
          ["Portfolio links", a.linkCount],
        ]),
        "",
        "Pitch:",
        pitch,
        "",
        `Review it: ${adminLink("/admin/creators")}`,
      ].join("\n"),
    });
  } catch (err) {
    console.error("[notify] creator application notification failed", err);
  }
}

export async function notifyCreatorDecision(d: {
  decision: "APPROVED" | "REJECTED";
  email: string;
  name: string;
  slug: string | null;
  reason: string | null;
}) {
  try {
    if (!isValidEmail(d.email.trim().toLowerCase())) return;
    if (d.decision === "APPROVED") {
      await sendEmail({
        to: d.email,
        subject: "Welcome to the Taita Field Crew",
        text: [
          `Hi ${d.name},`,
          "",
          "Your application to join the Taita Field Crew has been approved — welcome!",
          "",
          `Your public profile: ${adminLink(`/creators/${d.slug}`)}`,
          "",
          "We'll be in touch about missions. Until then, please keep the creator guidelines in mind —",
          "especially: show real evidence, and always disclose when something was hosted, gifted or sponsored.",
        ].join("\n"),
      });
    } else {
      await sendEmail({
        to: d.email,
        subject: "About your Taita Field Crew application",
        text: [
          `Hi ${d.name},`,
          "",
          "Thank you for applying to the Taita Field Crew. We aren't able to approve your application right now.",
          ...(d.reason ? ["", `Note from the team: ${d.reason}`] : []),
          "",
          `You're welcome to apply again any time: ${adminLink("/creators/apply")}`,
        ].join("\n"),
      });
    }
  } catch (err) {
    console.error("[notify] creator decision notification failed", err);
  }
}

// ---------------------------------------------------------------------------
// Field Notes: submissions and decisions
// ---------------------------------------------------------------------------
// A new or revised note goes to the team inbox; a decision goes to the creator's own
// account email. Never throws, and never blocks the action that triggered it.

export async function notifyFieldNoteSubmitted(n: {
  title: string;
  creatorName: string;
  missionTitle: string;
  place: string;
  revised: boolean;
}) {
  try {
    const team = parseRecipients(process.env.NOTIFY_EMAIL);
    if (team.length === 0) return;
    await sendEmail({
      to: team,
      subject: `${n.revised ? "Revised" : "New"} Field Note to review: ${n.title}`,
      text: [
        n.revised ? "A creator has revised a Field Note after feedback." : "A creator has filed a Field Note.",
        "",
        details([
          ["Title", n.title],
          ["Creator", n.creatorName],
          ["Mission", n.missionTitle],
          ["Place", n.place],
        ]),
        "",
        "It was filed after a verified check-in at the place.",
        `Review it: ${adminLink("/admin/field-notes")}`,
      ].join("\n"),
    });
  } catch (err) {
    console.error("[notify] field note submission notification failed", err);
  }
}

export async function notifyFieldNoteDecision(d: {
  decision: "APPROVED" | "CHANGES_REQUESTED";
  email: string;
  name: string;
  title: string;
  slug: string;
  reason: string | null;
  points: number;
}) {
  try {
    if (!isValidEmail(d.email.trim().toLowerCase())) return;
    if (d.decision === "APPROVED") {
      await sendEmail({
        to: d.email,
        subject: `Your Field Note is published: ${d.title}`,
        text: [
          `Hi ${d.name},`,
          "",
          `Your Field Note "${d.title}" has been approved and is now live with a "Verified on location" badge.`,
          "",
          `See it: ${adminLink(`/notes/${d.slug}`)}`,
          ...(d.points > 0 ? ["", `We've added ${d.points} points to your Passport.`] : []),
        ].join("\n"),
      });
    } else {
      await sendEmail({
        to: d.email,
        subject: `Changes requested on your Field Note: ${d.title}`,
        text: [
          `Hi ${d.name},`,
          "",
          `Thanks for filing "${d.title}". Before we can publish it, we'd like a few changes:`,
          "",
          d.reason ?? "",
          "",
          `You can edit and resubmit it from your crew page: ${adminLink("/crew")}`,
        ].join("\n"),
      });
    }
  } catch (err) {
    console.error("[notify] field note decision notification failed", err);
  }
}
