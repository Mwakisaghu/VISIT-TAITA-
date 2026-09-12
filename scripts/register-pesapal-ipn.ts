// One-time setup: registers this app's IPN endpoint with Pesapal and prints
// the ipn_id to paste into PESAPAL_IPN_ID in your .env file.
//
// Run with: npx tsx scripts/register-pesapal-ipn.ts
//
// Re-run this if NEXT_PUBLIC_APP_URL ever changes (e.g. moving from an
// ngrok tunnel to your real production domain) — each URL gets its own
// ipn_id, and PESAPAL_IPN_ID needs to match whichever URL is actually live.

import "dotenv/config";
import { registerIpnUrl } from "../lib/pesapal";

async function main() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    console.error("Set NEXT_PUBLIC_APP_URL in your environment before running this.");
    process.exit(1);
  }

  const ipnUrl = `${appUrl}/api/payments/pesapal/ipn`;
  console.log(`Registering IPN URL: ${ipnUrl}`);

  const result = await registerIpnUrl(ipnUrl);

  console.log("\nSuccess. Add this to your .env:");
  console.log(`PESAPAL_IPN_ID="${result.ipn_id}"`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
