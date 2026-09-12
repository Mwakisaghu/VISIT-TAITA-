// Pesapal API v3 integration (Kenya-friendly card + mobile money processor).
// Docs: https://developer.pesapal.com
//
// Required env vars (see .env.example):
//   PESAPAL_ENV               sandbox | production
//   PESAPAL_CONSUMER_KEY
//   PESAPAL_CONSUMER_SECRET
//   PESAPAL_IPN_ID             from a one-time IPN registration — see README
//   NEXT_PUBLIC_APP_URL        used to build the per-order callback URL

const BASE_URL =
  process.env.PESAPAL_ENV === "production"
    ? "https://pay.pesapal.com/v3"
    : "https://cybqa.pesapal.com/pesapalv3";

async function getAccessToken(): Promise<string> {
  const consumerKey = process.env.PESAPAL_CONSUMER_KEY;
  const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET;
  if (!consumerKey || !consumerSecret) {
    throw new Error("Pesapal is not configured (missing consumer key/secret).");
  }

  const res = await fetch(`${BASE_URL}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ consumer_key: consumerKey, consumer_secret: consumerSecret }),
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok || !data.token) {
    throw new Error(data.message || "Could not authenticate with Pesapal.");
  }
  return data.token as string;
}

/**
 * One-time setup helper — registers a URL to receive IPN (Instant Payment
 * Notification) calls and returns the ipn_id you then paste into
 * PESAPAL_IPN_ID. Not called at runtime; see README for how to run this.
 */
export async function registerIpnUrl(url: string) {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}/api/URLSetup/RegisterIPN`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ url, ipn_notification_type: "GET" }),
  });
  const data = await res.json();
  if (!res.ok || !data.ipn_id) {
    throw new Error(data.message || "Could not register the IPN URL with Pesapal.");
  }
  return data as { ipn_id: string; url: string };
}

export type SubmitOrderResult = {
  order_tracking_id: string;
  merchant_reference: string;
  redirect_url: string;
};

export async function submitOrderRequest({
  merchantReference,
  amount,
  description,
  callbackUrl,
  email,
  phone,
  firstName,
  lastName,
}: {
  merchantReference: string;
  amount: number;
  description: string;
  callbackUrl: string;
  email?: string;
  phone: string;
  firstName?: string;
  lastName?: string;
}): Promise<SubmitOrderResult> {
  const ipnId = process.env.PESAPAL_IPN_ID;
  if (!ipnId) {
    throw new Error("Pesapal is not fully configured (missing PESAPAL_IPN_ID — see README).");
  }

  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}/api/Transactions/SubmitOrderRequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      id: merchantReference,
      currency: "KES",
      amount,
      description,
      callback_url: callbackUrl,
      notification_id: ipnId,
      billing_address: {
        email_address: email,
        phone_number: phone,
        country_code: "KE",
        first_name: firstName || "Visit",
        last_name: lastName || "Taita",
      },
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || data.message || "Pesapal order request failed.");
  }
  return data as SubmitOrderResult;
}

export type PesapalTransactionStatus = {
  payment_method: string;
  amount: number;
  confirmation_code: string;
  payment_status_description: "COMPLETED" | "FAILED" | "INVALID" | "REVERSED" | string;
  merchant_reference: string;
  order_tracking_id: string;
};

export async function getTransactionStatus(orderTrackingId: string): Promise<PesapalTransactionStatus> {
  const token = await getAccessToken();
  const res = await fetch(
    `${BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    }
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Could not fetch Pesapal transaction status.");
  }
  return data as PesapalTransactionStatus;
}
