import { MAX_COMMISSION_PERCENT, MAX_HOLD_DAYS, splitAmount } from "@/lib/payout";

// "Where your money goes": what a guest's payment is split into, using the SAME rule payouts use (splitAmount), so the label can never
// disagree with what actually happens. It is shown only where money really does go to a host through the site.
const MAX_PRICE = 1_000_000;

/** Only experiences that have a host, can be booked online, and have a price. Experiences Visit Taita runs itself never produce a payout, so they get no label. */
export function showMoneyLabel(x: { ownerId: string | null | undefined; bookingEnabled: boolean | null | undefined; priceFrom: number | null | undefined }): boolean {
  return !!x.ownerId && x.bookingEnabled === true && Number.isInteger(x.priceFrom) && (x.priceFrom as number) > 0;
}

export type MoneyLabelData = { price: number; hostPercent: number; platformPercent: number; hostAmount: number; platformAmount: number; holdDays: number };

/** The split of one person's price at the current commission. Null (so nothing is shown) if any input is not a sensible number. */
export function moneyLabel(price: number, commissionPercent: number, holdDays: number): MoneyLabelData | null {
  const whole = (n: unknown, min: number, max: number) => Number.isInteger(n) && (n as number) >= min && (n as number) <= max;
  if (!whole(price, 1, MAX_PRICE) || !whole(commissionPercent, 0, MAX_COMMISSION_PERCENT) || !whole(holdDays, 0, MAX_HOLD_DAYS)) return null;
  const s = splitAmount(price, commissionPercent);
  return { price, hostPercent: 100 - commissionPercent, platformPercent: commissionPercent, hostAmount: s.net, platformAmount: s.commission, holdDays };
}

/** When the host is paid, in the words the payout rules allow: after the experience takes place, then a check period. */
export const holdSentence = (days: number): string => (days <= 0 ? "The host is paid after the experience takes place." : `The host is paid after the experience takes place, following a ${days}-day check period.`);
