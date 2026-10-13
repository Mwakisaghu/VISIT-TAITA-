export const dynamic = "force-dynamic";

/** Is the AI guide switched on? (It is when a key has been set.) Nothing else is revealed. */
export async function GET() {
  return new Response(JSON.stringify({ ai: !!(process.env.ANTHROPIC_API_KEY ?? "").trim() }), { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "public, s-maxage=60" } });
}
