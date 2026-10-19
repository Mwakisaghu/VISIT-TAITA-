// The password rule's messages, in the person's language. The rule itself (lib/password-policy.ts) returns a reason; the words live here, so each can be translated.
import { PASSWORD_MAX, PASSWORD_MIN, type PasswordCheck } from "@/lib/password-policy";

type Tr = (text: string, vars?: Record<string, string | number>) => string;
export function passwordProblemText(problem: Exclude<PasswordCheck, { ok: true }>, tr: Tr): string {
  switch (problem.reason) {
    case "short": return tr("Use at least {min} characters.", { min: PASSWORD_MIN });
    case "long": return tr("Use at most {max} characters.", { max: PASSWORD_MAX });
    case "breached": return tr("This password has appeared in a known data breach, so it is not safe to use. Please choose a different one.");
    case "common": return tr("That password is too easy to guess. Try three or four unrelated words, or something only you would know.");
    case "personal": return tr("Your password should not contain your name or email address.");
    default: return problem.detail === "variety" ? tr("Use more different characters: a short phrase of unrelated words works well.") : tr("Avoid repeated or sequential characters, like 1111111111 or abcdefghij.");
  }
}
