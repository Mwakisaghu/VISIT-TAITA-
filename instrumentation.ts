// Next.js calls this when something fails while serving a request: a page that cannot be built, an API route that throws, a server action that fails. It is how failures on OUR server reach the admin's
// Error log. (It is NOT called for a redirect or a not-found: those are not failures.) It only does anything in the Node environment, where the database is, and it can never make the failure worse.
// The import MUST sit inside the `=== "nodejs"` block (not after an early return): this file is built for the edge environment too, and only that shape lets the build leave out the database code there.
export async function onRequestError(err: unknown, request: { path?: string; method?: string; headers?: Record<string, string | string[] | undefined> }, context: { routerKind?: string; routePath?: string; routeType?: string; renderSource?: string }) {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try { const { recordServerError } = await import("@/lib/error-log"); await recordServerError(err, request, context); } catch { /* reporting a failure must never become a failure */ }
  }
}
