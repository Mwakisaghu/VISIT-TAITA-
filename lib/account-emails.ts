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

/** Sent when two-step sign-in is turned on or off, so the owner knows if it was not them. */
export function twoStepChangedText(name: string, on: boolean): string {
  return [
    `Hi ${firstName(name)},`,
    "",
    on ? "Two-step sign-in was just turned ON for your Visit Taita account. From now on, signing in asks for a code from your authenticator app as well as your password." : "Two-step sign-in was just turned OFF for your Visit Taita account.",
    "",
    "If this was you, there's nothing more to do. If it wasn't, reset your password straight away and contact us.",
    "",
    "Visit Taita",
  ].join("\n");
}

/** To the person whose two-step sign-in a super admin has asked to reset: what is happening, when, and a link to stop it. */
export function twoStepResetRequestedText(name: string, requestedBy: string, whenText: string, cancelUrl: string): string {
  return [
    `Hi ${firstName(name)},`,
    "",
    `${requestedBy}, a super admin of Visit Taita, asked to RESET the two-step sign-in on your account. This happens when someone has lost their phone and their recovery codes.`,
    "",
    `Nothing has changed yet. It will take effect after ${whenText}, the next time you sign in.`,
    "",
    "If you did NOT expect this, stop it now and change your password:",
    cancelUrl,
    "",
    "Visit Taita",
  ].join("\n");
}
/** To the OTHER super admins: they are told, so a reset cannot happen quietly. */
export function twoStepResetNoticeText(requestedBy: string, targetName: string, targetEmail: string, whenText: string): string {
  return [
    `${requestedBy} asked to reset the two-step sign-in of ${targetName} (${targetEmail}).`,
    "",
    `It takes effect after ${whenText}. ${targetName} was emailed a link to cancel it, and any super admin can cancel it too, under Users, on their page.`,
    "",
    "If you did not expect this, cancel it and tell the others.",
    "",
    "Visit Taita",
  ].join("\n");
}
export function twoStepResetCancelledText(name: string, cancelledBy: string): string {
  return [`Hi ${firstName(name)},`, "", `The request to reset two-step sign-in on this account was cancelled (${cancelledBy}). Nothing has changed.`, "", "Visit Taita"].join("\n");
}
export function twoStepResetDoneText(name: string): string {
  return [`Hi ${firstName(name)},`, "", "The two-step sign-in on your Visit Taita account was just reset, as a super admin asked, and you have been signed out everywhere.", "", "If you did not expect this, change your password and contact us straight away. If your role requires two-step sign-in, you will be asked to set it up again.", "", "Visit Taita"].join("\n");
}

/** The 6-digit code for the email method of two-step sign-in. */
export function twoStepEmailCodeText(name: string, code: string, minutes: number): string {
  return [`Hi ${firstName(name)},`, "", `Your Visit Taita code is: ${code}`, "", `It works once and expires in ${minutes} minutes. Visit Taita staff will never ask you for it.`, "", "If you did not just try to sign in or set up two-step sign-in, someone may know your password: change it now.", "", "Visit Taita"].join("\n");
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
