import { handleChat, newLimits } from "@/lib/concierge-chat";
import { loadKnowledge } from "@/lib/concierge-kb";

export const dynamic = "force-dynamic";
const limits = newLimits(); // per server instance: a brake, not a guarantee (also set a spending limit with your AI provider)
const json = (body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

/** "Ask Taita": one question in, one grounded answer out. Nothing a visitor types is stored or logged. */
export async function POST(req: Request) {
  const len = Number(req.headers.get("content-length") ?? 0); if (len > 8000) return json({ error: "That is too much text. Please ask a shorter question." }, 413);
  const raw = await req.text().catch(() => null);
  const ip = (req.headers.get("x-nf-client-connection-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "anon").trim();
  const out = await handleChat({ raw, ip }, { env: process.env, fetchFn: fetch, now: Date.now, loadKb: () => loadKnowledge(), today: () => new Date().toISOString().slice(0, 10), limits });
  return json(out.body, out.status);
}
