import { buildContext, buildSystemPrompt, extractLinks, parseAnthropicReply, sanitizeMessages, createLimiter, type KB } from "@/lib/concierge-ai";

export const DEFAULT_MODEL = "claude-haiku-5-5";
export const API_URL = "https://api.anthropic.com/v1/messages";
export const FRIENDLY_ERROR = "The guide couldn't answer just now. Please try again in a moment, or use the Plan page.";
export type Deps = { env: Record<string, string | undefined>; fetchFn: typeof fetch; now: () => number; loadKb: () => Promise<KB>; today: () => string; limits: { minute: ReturnType<typeof createLimiter>; hour: ReturnType<typeof createLimiter>; day: { count: number; day: string } } };
export const newLimits = (): Deps["limits"] => ({ minute: createLimiter({ windowMs: 60_000, max: 6 }), hour: createLimiter({ windowMs: 3_600_000, max: 40 }), day: { count: 0, day: "" } });
type Out = { status: number; body: Record<string, unknown> };
const fail = (status: number, error: string): Out => ({ status, body: { error } });

/** The whole of one "Ask Taita" request, with everything outside it passed in, so it can be tested without a network. Never keeps or logs what anyone asked. */
export async function handleChat(input: { raw: string | null; ip: string }, d: Deps): Promise<Out> {
  const key = (d.env.ANTHROPIC_API_KEY ?? "").trim(); if (!key) return fail(404, "The guide isn't switched on.");
  if (input.raw === null || input.raw.length === 0) return fail(400, "Ask a question first."); if (input.raw.length > 8000) return fail(413, "That is too much text. Please ask a shorter question.");
  let body: unknown; try { body = JSON.parse(input.raw); } catch { return fail(400, "That message can't be read."); }
  const s = sanitizeMessages((body as { messages?: unknown } | null)?.messages); if (!s.ok) return fail(400, s.error);

  const now = d.now(); const today = d.today(); const cap = Math.max(1, Math.min(5000, Number.parseInt(d.env.CONCIERGE_DAILY_LIMIT ?? "", 10) || 300));
  if (d.limits.day.day !== today) { d.limits.day.day = today; d.limits.day.count = 0; }
  if (!d.limits.minute.take(input.ip, now) || !d.limits.hour.take(input.ip, now) || d.limits.day.count >= cap) return fail(429, "Taita Guide is busy right now. Please try again later, or use the Plan page.");
  d.limits.day.count++;

  let kb: KB; try { kb = await d.loadKb(); } catch { return fail(502, FRIENDLY_ERROR); }
  const ctx = buildContext(kb); const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 20_000);
  try {
    const res = await d.fetchFn(API_URL, { method: "POST", signal: ctl.signal, headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: (d.env.CONCIERGE_MODEL ?? "").trim() || DEFAULT_MODEL, max_tokens: 350, temperature: 0.3, system: buildSystemPrompt(ctx.text, today), messages: s.messages }) });
    if (!res.ok) { console.error("[concierge] the AI service answered with status", res.status); return fail(502, FRIENDLY_ERROR); }
    const reply = parseAnthropicReply(await res.json()); if (!reply) return fail(502, FRIENDLY_ERROR);
    return { status: 200, body: { reply, links: extractLinks(reply, ctx.index) } };
  } catch (e) { console.error("[concierge] the AI request failed:", e instanceof Error ? e.name : "error"); return fail(502, FRIENDLY_ERROR); } finally { clearTimeout(timer); }
}
