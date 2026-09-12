import Stripe from "stripe";

// Lazily constructed so importing this module doesn't crash an app that
// hasn't configured Stripe yet (e.g. M-Pesa-only deployments) — the error
// only surfaces if something actually tries to use Stripe.
let client: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Stripe is not configured (missing STRIPE_SECRET_KEY).");
  }
  client = new Stripe(key, { apiVersion: "2026-08-26.dahlia" });
  return client;
}
