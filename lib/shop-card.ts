// How a product is worded on a shop CARD (the card is small, so it says less). Display only: the product's real name is unchanged on its page, in the cart and in orders.
import { formatMetres } from "@/lib/field-guide";

/**
 * The name as shown on a card: a leading "Visit Taita " is dropped (it is the shop's own name, repeated on every card, and it forced two-line titles) and a dash between the name and the variant becomes a middle dot,
 * so "Visit Taita Classic Tee — White" reads "Classic Tee · White". The shop's name is only dropped when something follows it, so a product called just "Visit Taita" keeps its name.
 */
export function cardTitle(name: string): string {
  return String(name ?? "").trim().replace(/^visit taita\s+/i, "").replace(/\s+[\u2014\u2013-]\s+/g, " \u00b7 ");
}

/** The maker's place on a card: the village, and the height in metres when it is known ("Sechu Village · 1,550 m"). The zone name ("Highlands") is left to the maker's own page. */
export function makerPlace(m: { village: string; altitudeM: number | null }): string {
  return m.altitudeM != null ? `${m.village} \u00b7 ${formatMetres(m.altitudeM)}` : m.village;
}
