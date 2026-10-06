import { randomInt } from "crypto";

// Server-only (uses Node's crypto): kept out of lib/booking.ts, which the browser also loads.
const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I: read aloud and copied by hand without mistakes
export const generateReference = () => `VT-${Array.from({ length: 8 }, () => REF_ALPHABET[randomInt(REF_ALPHABET.length)]).join("")}`;
