// The text of the account emails (pure). These are service messages, not marketing: no unsubscribe link, no tracking.

export function verificationText(name: string, url: string): string {
  return [
    `Hi ${firstName(name)},`,
    "",
    "Please confirm that this is your email address so you can write reviews and apply to the Field Crew:",
    url,
    "",
    "The link works for 3 days. If you didn't create a Visit Taita account, you can ignore this email.",
    "",
    "Visit Taita",
  ].join("\n");
}

export function resetText(name: string, url: string): string {
  return [
    `Hi ${firstName(name)},`,
    "",
    "Someone asked to reset the password for your Visit Taita account. To choose a new one, open this link:",
    url,
    "",
    "It works once, for 1 hour. If you didn't ask for this, ignore this email — your password won't change.",
    "",
    "Visit Taita",
  ].join("\n");
}

export function passwordChangedText(name: string): string {
  return [
    `Hi ${firstName(name)},`,
    "",
    "The password for your Visit Taita account was just changed, and you've been signed out on your other devices.",
    "",
    "If this was you, there's nothing more to do. If it wasn't, reset your password again straight away and contact us.",
    "",
    "Visit Taita",
  ].join("\n");
}

function firstName(name: string): string {
  return String(name ?? "").trim().split(/\s+/)[0] || "there";
}

export function inviteText(name: string, inviterName: string, roleLabel: string, url: string, loginUrl: string): string {
  return [
    `Hi ${firstName(name)},`,
    "",
    `${inviterName} has invited you to help run Visit Taita as ${roleLabel}.`,
    "",
    "To get started, choose your own password with this link:",
    url,
    "",
    `It works once, for 7 days. After that you can sign in at ${loginUrl} and open the Admin area.`,
    "",
    "If you weren't expecting this, ignore this email — nothing happens, and no one can sign in as you until you choose a password.",
    "",
    "Visit Taita",
  ].join("\n");
}
