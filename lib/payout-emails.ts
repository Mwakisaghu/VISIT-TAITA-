import { sendEmail } from "@/lib/email";
import { kes, maskPhone } from "@/lib/payout";

// Deliberately NOT a "use server" file. Never throws: a failed email must not undo a recorded payout.
export async function notifyPayoutSent(p: { to: string; hostName: string; amount: number; bookingCount: number; destination: string; reference: string }) {
  const first = (p.hostName || "there").trim().split(/\s+/)[0];
  const text = `Hello ${first},\n\nWe have sent your payout: ${kes(p.amount)} for ${p.bookingCount} booking${p.bookingCount === 1 ? "" : "s"}, to M-Pesa number ${maskPhone(p.destination)}.\nM-Pesa receipt: ${p.reference}\n\nThe booking-by-booking breakdown is on your Payouts page. If the money hasn't reached you, or the number is wrong, please reply to this email.\n\nVisit Taita`;
  try { await sendEmail({ to: p.to, subject: `Your payout of ${kes(p.amount)} has been sent`, text }); } catch (e) { console.error("[payouts] email failed:", (e as Error).message); }
}
