// The email a partner applicant receives when they ask for the status of their application. The page itself shows nothing (see getApplicationStatus), so only the owner of the mailbox learns it.
const firstName = (n: string) => (String(n ?? "").trim().split(/\s+/)[0] || "there").slice(0, 40);
const WHEN = (d: Date) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Nairobi" });
const STATUS: Record<string, string> = {
  PENDING: "It is waiting for us to review it. We read every application, and we will email you as soon as we have decided.",
  APPROVED: "It has been approved. Welcome! If you have not yet been told how to sign in to the partner area, reply to this email and we will help.",
  REJECTED: "We are not able to take it forward at the moment. Thank you for your interest. You are welcome to apply again if things change.",
};
export function applicationStatusText(a: { contactName: string; businessName: string; status: string; createdAt: Date }): string {
  return [
    `Hi ${firstName(a.contactName)},`,
    "",
    `You asked about your Visit Taita partner application for ${String(a.businessName).slice(0, 120)}, sent on ${WHEN(a.createdAt)}.`,
    "",
    STATUS[a.status] ?? "We are looking at it and will be in touch.",
    "",
    "If you did not ask, you can ignore this email: nothing has changed, and no one else was shown anything.",
    "",
    "Visit Taita",
  ].join("\n");
}
