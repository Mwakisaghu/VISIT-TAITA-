import { createHash, createHmac } from "crypto";

// AWS Signature Version 4 for S3-compatible storage (Cloudflare R2, AWS S3, Backblaze B2, DigitalOcean Spaces, MinIO…).
// Written out by hand so the site needs no cloud SDK and runs the same on Vercel and Netlify. Checked in the tests against
// AWS's own published example (a known request with a known signature).

export const sha256Hex = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const hmac = (key: string | Buffer, data: string) => createHmac("sha256", key).update(data).digest();

export type SignInput = {
  method: string;
  host: string;
  /** The URL path, already percent-encoded, starting with "/". */
  path: string;
  /** The canonical query string ("" if none). */
  query?: string;
  /** Extra headers to sign (content-type, cache-control, range…). */
  headers?: Record<string, string>;
  /** sha256 of the body as hex (use EMPTY_SHA256 for no body). */
  payloadHash: string;
  region: string;
  service?: string;
  accessKeyId: string;
  secretAccessKey: string;
  now?: Date;
};

export const EMPTY_SHA256 = sha256Hex("");

export function signRequest(i: SignInput) {
  const now = i.now ?? new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ""); // 20130524T000000Z
  const dateStamp = amzDate.slice(0, 8);
  const service = i.service ?? "s3";

  const all: Record<string, string> = { host: i.host, "x-amz-content-sha256": i.payloadHash, "x-amz-date": amzDate };
  for (const [k, v] of Object.entries(i.headers ?? {})) all[k.toLowerCase()] = v;

  const names = Object.keys(all).sort();
  const canonicalHeaders = names.map((n) => `${n}:${all[n].trim().replace(/\s+/g, " ")}\n`).join("");
  const signedHeaders = names.join(";");

  const canonicalRequest = [i.method.toUpperCase(), i.path, i.query ?? "", canonicalHeaders, signedHeaders, i.payloadHash].join("\n");
  const scope = `${dateStamp}/${i.region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256Hex(canonicalRequest)].join("\n");

  const key = hmac(hmac(hmac(hmac(`AWS4${i.secretAccessKey}`, dateStamp), i.region), service), "aws4_request");
  const signature = createHmac("sha256", key).update(stringToSign).digest("hex");

  const authorization = `AWS4-HMAC-SHA256 Credential=${i.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return { authorization, signature, signedHeaders, canonicalRequest, amzDate, headers: { ...all, authorization } as Record<string, string> };
}
