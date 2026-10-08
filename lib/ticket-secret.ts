import { randomBytes } from "crypto";

// Server-only (Node's crypto): kept out of lib/ticket.ts, which the browser also loads.
/** The random token a ticket's QR code carries. 72 bits, URL-safe: can't be guessed from a ticket number or from another ticket's token. */
export const newTicketSecret = (): string => randomBytes(9).toString("base64url");
export const newGroupId = (): string => randomBytes(8).toString("base64url");
