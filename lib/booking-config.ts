/** Which payment methods are actually set up on this server (so the booking page only offers what will work). */
export function paymentChannels(env: Record<string, string | undefined> = process.env) {
  const has = (...k: string[]) => k.every((x) => (env[x] ?? "").trim().length > 0);
  return {
    mpesa: has("MPESA_CONSUMER_KEY", "MPESA_CONSUMER_SECRET", "MPESA_SHORTCODE", "MPESA_PASSKEY", "MPESA_CALLBACK_URL"),
    card: has("PESAPAL_CONSUMER_KEY", "PESAPAL_CONSUMER_SECRET", "PESAPAL_IPN_ID", "NEXT_PUBLIC_APP_URL"),
  };
}
