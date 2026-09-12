// M-Pesa (Safaricom Daraja API) integration.
//
// Required env vars (see .env.example):
//   MPESA_ENV                sandbox | production
//   MPESA_CONSUMER_KEY
//   MPESA_CONSUMER_SECRET
//   MPESA_SHORTCODE          Paybill/Till number (sandbox default: 174379)
//   MPESA_PASSKEY            Sandbox passkey is public, see Daraja docs
//   MPESA_CALLBACK_URL       Must be a publicly reachable HTTPS URL —
//                            Safaricom cannot call back to localhost.
//                            Use a tunnel (ngrok, ngrok-equivalent) in dev.

const BASE_URL =
  process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

function timestamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

/** Normalizes a Kenyan phone number to the 2547XXXXXXXX format Daraja expects. */
export function normalizeMpesaPhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.startsWith("7") || digits.startsWith("1")) return `254${digits}`;
  return digits;
}

async function getAccessToken(): Promise<string> {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) {
    throw new Error("M-Pesa is not configured (missing consumer key/secret).");
  }

  const credentials = Buffer.from(`${key}:${secret}`).toString("base64");
  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Could not authenticate with M-Pesa.");
  }
  const data = await res.json();
  return data.access_token as string;
}

export type StkPushResult = {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
};

/**
 * Triggers an STK push ("Lipa Na M-Pesa Online") prompt on the customer's
 * phone. The result here only tells us the *request* was accepted — the
 * actual payment result arrives asynchronously at MPESA_CALLBACK_URL.
 */
export async function initiateStkPush({
  phone,
  amount,
  accountReference,
  description,
}: {
  phone: string;
  amount: number;
  accountReference: string;
  description: string;
}): Promise<StkPushResult> {
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;
  if (!shortcode || !passkey || !callbackUrl) {
    throw new Error("M-Pesa is not fully configured (missing shortcode/passkey/callback URL).");
  }

  const token = await getAccessToken();
  const ts = timestamp();
  const password = Buffer.from(`${shortcode}${passkey}${ts}`).toString("base64");
  const normalizedPhone = normalizeMpesaPhone(phone);

  const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: ts,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(amount),
      PartyA: normalizedPhone,
      PartyB: shortcode,
      PhoneNumber: normalizedPhone,
      CallBackURL: callbackUrl,
      AccountReference: accountReference,
      TransactionDesc: description,
    }),
  });

  const data = await res.json();

  if (!res.ok || data.ResponseCode !== "0") {
    throw new Error(data.errorMessage || data.ResponseDescription || "M-Pesa request failed.");
  }

  return data as StkPushResult;
}

export type StkCallbackMetadataItem = { Name: string; Value?: string | number };

/** Shape of the payload Safaricom POSTs to our callback URL. */
export type MpesaCallbackBody = {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: { Item: StkCallbackMetadataItem[] };
    };
  };
};

export function extractCallbackMetadata(items: StkCallbackMetadataItem[] = []) {
  const find = (name: string) => items.find((i) => i.Name === name)?.Value;
  return {
    amount: find("Amount") as number | undefined,
    receiptNumber: find("MpesaReceiptNumber") as string | undefined,
    transactionDate: find("TransactionDate") as number | undefined,
    phoneNumber: find("PhoneNumber") as number | undefined,
  };
}
