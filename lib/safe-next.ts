/**
 * Validates a post-login "return to" path. Only same-site relative paths are
 * allowed — anything that could send someone to another site ("//evil.com",
 * "/\evil.com", "https://…", control characters) is rejected.
 */
export function safeNext(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (value.length === 0 || value.length > 300) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (/[\u0000-\u001f\\]/.test(value)) return null;
  return value;
}
