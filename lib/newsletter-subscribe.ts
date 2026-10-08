import { randomBytes } from "crypto";
import { z } from "zod";
import { checkinBaseUrl } from "@/lib/checkin-url";
import { sendEmail } from "@/lib/email";
import { confirmUrl, confirmationText, unsubscribeApiUrl } from "@/lib/newsletter";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

// Deliberately NOT a "use server" file. Server actions are public endpoints, so a function that takes the visitor's address
// as an argument would let a caller invent one to dodge the per-visitor limit. Only the sign-up API route calls this, and it
// reads the address from the request itself.

const HOUR_MS = 60 * 60 * 1000;

export type SubscribeResult = { ok: true } | { ok: false; error: string; status: number };

const emailSchema = z.string().trim().toLowerCase().email().max(254);

/** 96 random bits, URL-safe: unguessable, so the link itself is the proof of owning the address. */
function newToken() {
  return randomBytes(12).toString("base64url");
}

/**
 * Starts a subscription. DOUBLE OPT-IN: nobody is ever added to the mailing list just because someone typed their address
 * into a form — they are PENDING until they click the link we email them. The response is the same whether or not the
 * address was already known, so the form can't be used to discover who is subscribed.
 */
export async function subscribeToNewsletter(rawEmail: string, ip: string | null): Promise<SubscribeResult> {
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) return { ok: false, error: "Enter a valid email address.", status: 400 };
  const email = parsed.data;

  // Anyone can submit anyone's address, so this is rate-limited by both the sender and the address.
  if (ip && !await checkRateLimit(`newsletter:ip:${ip}`, 10, HOUR_MS)) return { ok: false, error: "Too many attempts — please try again later.", status: 429 };
  if (!await checkRateLimit(`newsletter:email:${email}`, 3, HOUR_MS)) return { ok: true }; // quietly: don't let the address be mail-bombed with confirmations

  const base = checkinBaseUrl();
  if (!base) return { ok: false, error: "Newsletter sign-up isn't available yet.", status: 503 };

  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email }, select: { id: true, status: true, confirmedAt: true, token: true } });

  // Already confirmed: nothing to do (and nothing is emailed, so this reveals nothing).
  if (existing && existing.status === "ACTIVE" && existing.confirmedAt) return { ok: true };

  const token = existing?.status === "PENDING" && existing.token ? existing.token : newToken();
  if (!existing) {
    await prisma.newsletterSubscriber.create({ data: { email, status: "PENDING", token } });
  } else {
    // New, pending (resend), legacy-unconfirmed, or previously unsubscribed: (re)start confirmation with a clean slate.
    await prisma.newsletterSubscriber.update({ where: { id: existing.id }, data: { status: "PENDING", token, unsubscribedAt: null, confirmedAt: null } });
  }

  await sendEmail({
    to: email,
    subject: "Please confirm your Visit Taita newsletter subscription",
    text: confirmationText(confirmUrl(base, token)),
    unsubscribeUrl: unsubscribeApiUrl(base, token),
  });
  return { ok: true };
}
