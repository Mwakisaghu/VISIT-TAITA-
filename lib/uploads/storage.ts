import { getSiteUrl } from "@/lib/site-url";
import { KEY_PATTERN } from "@/lib/uploads/policy";
import { EMPTY_SHA256, sha256Hex, signRequest } from "@/lib/uploads/sigv4";

export type StorageDriver = {
  name: "s3" | "local";
  /** Stores the bytes at `key` and returns the public URL it is served from. Throws a safe, secret-free Error on failure. */
  put(key: string, body: Buffer, contentType: string): Promise<{ url: string }>;
  /** Removes it. Removing something that is already gone is not an error. */
  remove(key: string): Promise<void>;
};

export type StorageResult = { driver: StorageDriver; reason?: undefined } | { driver: null; reason: string };

/** A key must have exactly the shape we generate: this is what stops a key ever being a path to somewhere else. */
export function assertSafeKey(key: string): void {
  if (!KEY_PATTERN.test(key)) throw new Error("Invalid storage key.");
}

const encodeKey = (key: string) => key.split("/").map(encodeURIComponent).join("/");

type S3Config = { endpoint: URL; region: string; bucket: string; accessKeyId: string; secretAccessKey: string; publicUrl: string; pathStyle: boolean };

const isLocalHost = (u: URL) => u.hostname === "localhost" || u.hostname === "127.0.0.1";
function httpsUrl(raw: string | undefined): URL | null {
  try {
    const u = new URL(String(raw ?? "").trim());
    return u.protocol === "https:" || (u.protocol === "http:" && isLocalHost(u)) ? u : null; // plain http only for a local test server
  } catch {
    return null;
  }
}

/** Reads the S3_* settings. null = none are set; a string = they are set but incomplete or wrong (names only, never values). */
export function readS3Config(env: Record<string, string | undefined>): S3Config | string | null {
  const keys = ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_PUBLIC_URL"];
  if (![...keys, "S3_REGION"].some((k) => (env[k] ?? "").trim())) return null;
  const missing = keys.filter((k) => !(env[k] ?? "").trim());
  if (missing.length) return `Image storage is partly set up — missing ${missing.join(", ")}.`;
  const endpoint = httpsUrl(env.S3_ENDPOINT);
  if (!endpoint) return "S3_ENDPOINT must be an https:// address.";
  const publicUrl = httpsUrl(env.S3_PUBLIC_URL);
  if (!publicUrl) return "S3_PUBLIC_URL must be an https:// address.";
  const bucket = env.S3_BUCKET!.trim();
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket)) return "S3_BUCKET isn't a valid bucket name.";
  return {
    endpoint, bucket, publicUrl: publicUrl.href.replace(/\/+$/, ""),
    region: (env.S3_REGION ?? "").trim() || "auto", // Cloudflare R2 uses "auto"; AWS needs the real region
    accessKeyId: env.S3_ACCESS_KEY_ID!.trim(), secretAccessKey: env.S3_SECRET_ACCESS_KEY!.trim(),
    pathStyle: (env.S3_FORCE_PATH_STYLE ?? "true").toLowerCase() !== "false",
  };
}

export function s3Driver(cfg: S3Config, fetchImpl: typeof fetch = fetch): StorageDriver {
  const target = (key: string) => {
    const enc = encodeKey(key);
    return cfg.pathStyle
      ? { host: cfg.endpoint.host, path: `/${cfg.bucket}/${enc}`, url: `${cfg.endpoint.origin}/${cfg.bucket}/${enc}` }
      : { host: `${cfg.bucket}.${cfg.endpoint.host}`, path: `/${enc}`, url: `${cfg.endpoint.protocol}//${cfg.bucket}.${cfg.endpoint.host}/${enc}` };
  };
  async function send(method: "PUT" | "DELETE", key: string, body: Buffer | null, extra: Record<string, string>) {
    assertSafeKey(key);
    const t = target(key);
    const signed = signRequest({ method, host: t.host, path: t.path, headers: extra, payloadHash: body ? sha256Hex(body) : EMPTY_SHA256, region: cfg.region, accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey });
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 20_000);
    try {
      const res = await fetchImpl(t.url, { method, headers: signed.headers, body: body ? new Uint8Array(body) : undefined, signal: ctl.signal });
      return res;
    } catch {
      throw new Error("Couldn't reach the image storage.");
    } finally {
      clearTimeout(timer);
    }
  }
  const failure = async (what: string, res: Response) => {
    // The provider's error body can echo the access key id, so only its short error CODE is ever used.
    const code = /<Code>([A-Za-z]+)<\/Code>/.exec(await res.text().catch(() => ""))?.[1];
    return new Error(`${what} (HTTP ${res.status}${code ? `, ${code}` : ""}).`);
  };
  return {
    name: "s3",
    async put(key, body, contentType) {
      const res = await send("PUT", key, body, { "content-type": contentType, "cache-control": "public, max-age=31536000, immutable" });
      if (![200, 201, 204].includes(res.status)) throw await failure("The image storage refused the upload", res);
      return { url: `${cfg.publicUrl}/${encodeKey(key)}` };
    },
    async remove(key) {
      const res = await send("DELETE", key, null, {});
      if (![200, 204, 404].includes(res.status)) throw await failure("The image storage refused the delete", res);
    },
  };
}

/** Development only: writes into public/uploads. Never used in production (a serverless disk is read-only and temporary). */
export function localDriver(root: string = process.cwd()): StorageDriver {
  return {
    name: "local",
    async put(key, body) {
      assertSafeKey(key);
      const fs = await import("fs/promises");
      const path = await import("path");
      const file = path.join(root, "public", "uploads", ...key.split("/"));
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, body);
      return { url: `${getSiteUrl()}/uploads/${key}` };
    },
    async remove(key) {
      assertSafeKey(key);
      const fs = await import("fs/promises");
      const path = await import("path");
      await fs.rm(path.join(root, "public", "uploads", ...key.split("/")), { force: true });
    },
  };
}

/** Which storage is in use: S3-compatible when configured; local disk in development; otherwise uploads are off. */
export function getStorage(env: Record<string, string | undefined> = process.env, fetchImpl?: typeof fetch): StorageResult {
  const s3 = readS3Config(env);
  if (typeof s3 === "string") return { driver: null, reason: s3 };
  if (s3) return { driver: s3Driver(s3, fetchImpl) };
  if (env.NODE_ENV !== "production") return { driver: localDriver() };
  return { driver: null, reason: "Image uploads aren't set up yet — set the S3_* storage settings." };
}
