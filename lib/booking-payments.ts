// Paying for a booking with M-Pesa or a card. NOT a "use server" file (server actions are public endpoints): called by the actions
// that have checked who is asking, by the payment callbacks, and by the scheduled job.
//
// THE RULE: a payment is only ever marked paid after the PROVIDER confirms it to us, server to server (Safaricom's STK query,
// Pesapal's transaction status) — never because a request arrived at our public callback URL saying so. The callback endpoints are
// unauthenticated, so anyone who learnt a checkout id could otherwise post a fake "success" and get a confirmed booking for free.
// The callbacks therefore only TRIGGER that check. The amount must match too.
import { normalizeMpesaPhone, initiateStkPush, queryStkPushStatus, extractCallbackMetadata, type MpesaCallbackBody } from "@/lib/mpesa";
import { getTransactionStatus, submitOrderRequest } from "@/lib/pesapal";
import { nextPaymentDue, type PaymentModeKey } from "@/lib/booking";
import { applyFailedPayment, applyPaidPayment, type PaidOutcome } from "@/lib/booking-ops";
import { notifyBooking } from "@/lib/booking-emails";
import { prisma } from "@/lib/prisma";

export type StartResult = { ok: true; paymentId: string; url?: string } | { ok: false; error: string };

/** Safaricom numbers: 07xx / 01xx / +2547xx / +2541xx. */
export const isSafaricomNumber = (normalised: string) => /^254[71]\d{8}$/.test(normalised);

type Payable = { ok: false; error: string; nothingDue?: boolean } | { ok: true; b: NonNullable<Awaited<ReturnType<typeof prisma.booking.findFirst>>>; due: { kind: "FULL" | "DEPOSIT" | "BALANCE"; amount: number } };

async function payableBooking(bookingId: string, userId: string, now: Date): Promise<Payable> {
  const b = await prisma.booking.findFirst({ where: { id: bookingId, userId } });
  if (!b) return { ok: false, error: "Booking not found." };
  if (b.status === "AWAITING_PAYMENT" && b.expiresAt && b.expiresAt <= now) return { ok: false, error: "The hold on your seats has expired. Please make the booking again." };
  const due = nextPaymentDue({ status: b.status, paymentMode: b.paymentMode as PaymentModeKey, totalAmount: b.totalAmount, depositAmount: b.depositAmount, paidAmount: b.paidAmount });
  if (!due || due.amount < 1) return { ok: false, nothingDue: true, error: b.status === "REQUESTED" ? "The host hasn't accepted this request yet, so there's nothing to pay." : "There is nothing to pay on this booking." };
  return { ok: true, b, due };
}

/** A payment prompt that was started a moment ago and hasn't resolved: don't send a second one on top of it. */
async function recentPending(bookingId: string, now: Date, seconds: number) {
  return prisma.bookingPayment.findFirst({ where: { bookingId, status: "PENDING", createdAt: { gt: new Date(now.getTime() - seconds * 1000) } } });
}

export async function startMpesaPayment(bookingId: string, userId: string, phoneRaw: string, now: Date = new Date()): Promise<StartResult> {
  const r = await payableBooking(bookingId, userId, now);
  if (!r.ok) return { ok: false, error: r.error };
  const phone = normalizeMpesaPhone(String(phoneRaw ?? ""));
  if (!isSafaricomNumber(phone)) return { ok: false, error: "Enter a valid Safaricom number, like 0712 345 678." };
  await syncBookingPayments(bookingId, now); // an earlier attempt may have just succeeded
  const again = await payableBooking(bookingId, userId, now);
  if (!again.ok) return { ok: false, error: again.nothingDue ? "This booking has just been paid. Thank you!" : again.error };
  if (await recentPending(bookingId, now, 90)) return { ok: false, error: "A payment request was just sent to your phone. Please check it — or wait a minute and try again." };

  const payment = await prisma.bookingPayment.create({ data: { bookingId, kind: again.due.kind, method: "MPESA", amount: again.due.amount, phone }, select: { id: true } });
  try {
    const stk = await initiateStkPush({ phone, amount: again.due.amount, accountReference: again.b.reference, description: `Visit Taita ${again.b.reference}` });
    await prisma.bookingPayment.update({ where: { id: payment.id }, data: { mpesaCheckoutRequestId: stk.CheckoutRequestID, mpesaMerchantRequestId: stk.MerchantRequestID } });
    return { ok: true, paymentId: payment.id };
  } catch (e) {
    const reason = e instanceof Error ? e.message : "M-Pesa request failed.";
    console.error(`[bookings] STK push failed for ${again.b.reference}:`, reason);
    await applyFailedPayment(prisma, payment.id, reason);
    return { ok: false, error: "We couldn't send the M-Pesa request just now. Please check the number and try again." };
  }
}

export async function startCardPayment(bookingId: string, userId: string, now: Date = new Date()): Promise<StartResult> {
  const r = await payableBooking(bookingId, userId, now);
  if (!r.ok) return { ok: false, error: r.error };
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return { ok: false, error: "Card payments aren't fully set up yet." };
  await syncBookingPayments(bookingId, now);
  const again = await payableBooking(bookingId, userId, now);
  if (!again.ok) return { ok: false, error: again.nothingDue ? "This booking has just been paid. Thank you!" : again.error };

  const [firstName, ...rest] = again.b.guestName.split(" ");
  const payment = await prisma.bookingPayment.create({ data: { bookingId, kind: again.due.kind, method: "CARD", amount: again.due.amount }, select: { id: true } });
  try {
    const submitted = await submitOrderRequest({
      merchantReference: `${again.b.reference}-${payment.id.slice(-8)}`, amount: again.due.amount, description: `Visit Taita booking ${again.b.reference}`,
      callbackUrl: `${appUrl}/bookings/${again.b.id}`, email: again.b.guestEmail, phone: again.b.guestPhone, firstName, lastName: rest.join(" ") || firstName,
    });
    await prisma.bookingPayment.update({ where: { id: payment.id }, data: { pesapalOrderTrackingId: submitted.order_tracking_id, pesapalMerchantReference: submitted.merchant_reference } });
    return { ok: true, paymentId: payment.id, url: submitted.redirect_url };
  } catch (e) {
    console.error(`[bookings] Pesapal order failed for ${again.b.reference}:`, e instanceof Error ? e.message : e);
    await applyFailedPayment(prisma, payment.id, e instanceof Error ? e.message : "Could not start card checkout.");
    return { ok: false, error: "We couldn't start the card payment just now. Please try again." };
  }
}

/** Emails and the like, after a payment has been applied. */
export async function notifyPaid(o: PaidOutcome, receipt?: string | null) {
  if (o.outcome === "confirmed" || o.outcome === "revived") await notifyBooking(o.bookingId, { kind: "confirmed", receipt });
  else if (o.outcome === "balance_paid") await notifyBooking(o.bookingId, { kind: "balancePaid" });
  else if (o.outcome === "refund_due") await notifyBooking(o.bookingId, { kind: "lateRefund", amount: o.amount, why: o.why });
}

// Safaricom words an unresolved request several ways ("being processed", "processing", "pending"); none of them is a final answer.
const STILL_PROCESSING = /being process|processing|pending|in progress/i;

/**
 * Asks the PROVIDER what happened to a waiting payment, and acts on the answer. Safe to call as often as you like: a payment is
 * only ever applied once. `hints` (from a callback) are checked but never trusted on their own.
 */
export async function syncPayment(paymentId: string, hints: { receipt?: string | null; amount?: number | null } = {}, now: Date = new Date()): Promise<void> {
  const p = await prisma.bookingPayment.findUnique({ where: { id: paymentId } });
  if (!p) return;
  if (p.status === "PAID") { if (hints.receipt && !p.mpesaReceiptNumber) await prisma.bookingPayment.update({ where: { id: p.id }, data: { mpesaReceiptNumber: hints.receipt } }); return; }
  if (p.status !== "PENDING") return;

  if (p.method === "MPESA") {
    if (!p.mpesaCheckoutRequestId) return;
    if (hints.receipt) await prisma.bookingPayment.updateMany({ where: { id: p.id, status: "PENDING", mpesaReceiptNumber: null }, data: { mpesaReceiptNumber: hints.receipt } });
    let q;
    try { q = await queryStkPushStatus(p.mpesaCheckoutRequestId); } catch { return; } // Safaricom has no final answer yet
    if (q.ResultCode === "0") {
      if (hints.amount != null && Number(hints.amount) !== p.amount) {
        await prisma.bookingPayment.updateMany({ where: { id: p.id, status: "PENDING" }, data: { failureReason: `Amount mismatch: M-Pesa reports ${hints.amount}, expected ${p.amount}. Needs checking.` } });
        console.error(`[bookings] AMOUNT MISMATCH on payment ${p.id}: reported ${hints.amount}, expected ${p.amount}`);
        return;
      }
      const out = await prisma.$transaction((tx) => applyPaidPayment(tx, p.id, now, { receipt: hints.receipt }));
      await notifyPaid(out, hints.receipt ?? p.mpesaReceiptNumber);
      return;
    }
    const desc = q.ResultDesc || "";
    if (!q.ResultCode || STILL_PROCESSING.test(desc)) return;
    await applyFailedPayment(prisma, p.id, desc || "The payment was not completed.");
    return;
  }

  if (p.method === "CARD" && p.pesapalOrderTrackingId) {
    let s;
    try { s = await getTransactionStatus(p.pesapalOrderTrackingId); } catch (e) { console.error("[bookings] Pesapal status failed:", (e as Error).message); return; }
    if (s.payment_status_description === "COMPLETED") {
      if (Number(s.amount) !== p.amount) {
        await prisma.bookingPayment.updateMany({ where: { id: p.id, status: "PENDING" }, data: { failureReason: `Amount mismatch: Pesapal reports ${s.amount}, expected ${p.amount}. Needs checking.` } });
        console.error(`[bookings] AMOUNT MISMATCH on payment ${p.id}: reported ${s.amount}, expected ${p.amount}`);
        return;
      }
      const out = await prisma.$transaction((tx) => applyPaidPayment(tx, p.id, now, { confirmationCode: s.confirmation_code }));
      await notifyPaid(out);
    } else if (["FAILED", "INVALID", "REVERSED"].includes(s.payment_status_description)) {
      await applyFailedPayment(prisma, p.id, `Pesapal: ${s.payment_status_description}`);
    }
  }
}

/** Checks every waiting payment on a booking. Used when the guest's page is open, so a missed callback never leaves them stuck. */
export async function syncBookingPayments(bookingId: string, now: Date = new Date()): Promise<void> {
  const pending = await prisma.bookingPayment.findMany({ where: { bookingId, status: "PENDING" }, select: { id: true }, take: 5 });
  for (const p of pending) { try { await syncPayment(p.id, {}, now); } catch (e) { console.error("[bookings] sync failed:", (e as Error).message); } }
}

/** M-Pesa's callback. Returns whether it was one of ours. The body is NOT trusted: it only prompts a check with Safaricom. */
export async function handleMpesaCallback(body: MpesaCallbackBody, now: Date = new Date()): Promise<boolean> {
  const cb = body?.Body?.stkCallback;
  if (!cb?.CheckoutRequestID || typeof cb.CheckoutRequestID !== "string") return false;
  const p = await prisma.bookingPayment.findUnique({ where: { mpesaCheckoutRequestId: cb.CheckoutRequestID }, select: { id: true } });
  if (!p) return false;
  const meta = cb.ResultCode === 0 ? extractCallbackMetadata(cb.CallbackMetadata?.Item) : { receiptNumber: undefined, amount: undefined };
  await syncPayment(p.id, { receipt: meta.receiptNumber ?? null, amount: meta.amount ?? null }, now);
  return true;
}

/** Pesapal's IPN. Returns whether it was one of ours. */
export async function handlePesapalIpn(trackingId: string, now: Date = new Date()): Promise<boolean> {
  const p = await prisma.bookingPayment.findUnique({ where: { pesapalOrderTrackingId: trackingId }, select: { id: true } });
  if (!p) return false;
  await syncPayment(p.id, {}, now);
  return true;
}
