// Pure helpers for partner voucher lookup (no Node-only imports).

// Same alphabet the codes are generated from (no 0/O/1/I).
const CODE_BODY = /^[A-HJ-NP-Z2-9]{6}$/;

/**
 * Accepts what a person might type or read out: "k7m2qx", "TAITA K7M2QX",
 * "taita-k7m2qx" -> "TAITA-K7M2QX". Returns null if it can't be a real code.
 */
export function normalizeVoucherCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.toUpperCase().replace(/[\s_-]+/g, "");
  const body = cleaned.startsWith("TAITA") ? cleaned.slice(5) : cleaned;
  return CODE_BODY.test(body) ? `TAITA-${body}` : null;
}

/**
 * How a partner sees the voucher holder: first name plus last initial, enough to
 * match against someone standing in front of them, without handing over a
 * visitor's full name or any contact details.
 */
export function holderLabel(fullName: string | null | undefined): string {
  const parts = String(fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Visitor";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}
