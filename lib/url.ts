/**
 * Returns the URL only if it parses and uses http(s); otherwise null.
 * Use at the rendering boundary for any admin/partner-supplied link —
 * z.string().url() alone also accepts schemes like javascript:.
 */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
