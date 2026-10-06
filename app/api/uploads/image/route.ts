import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { processImage } from "@/lib/uploads/process";
import { MAX_UPLOAD_BYTES, POLICIES, canUpload, isPurpose, uploadsPerHour } from "@/lib/uploads/policy";
import { getStorage } from "@/lib/uploads/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // sharp is native: this must not run on an edge runtime

const noStore = { "Cache-Control": "no-store" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: noStore });

/** Whether uploads are set up, and the limits — so a form can tell the person up front. Signed-in only. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return json({ error: "Please sign in." }, 401);
  const storage = getStorage();
  return json({ enabled: !!storage.driver, maxBytes: MAX_UPLOAD_BYTES, policies: Object.fromEntries(Object.entries(POLICIES).filter(([k]) => canUpload(session.user.role, k as never)).map(([k, v]) => [k, { minWidth: v.minWidth, minHeight: v.minHeight, maxEdge: v.maxEdge }])) });
}

/**
 * Receives ONE picture as the raw request body (?purpose=photo|product|logo|avatar|note), checks it, cleans it and stores it.
 * Who may upload what is decided here, on the server — the form is only a convenience.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return json({ error: "Please sign in." }, 401);
  const { id: userId, role } = session.user;

  const purpose = new URL(request.url).searchParams.get("purpose");
  if (!isPurpose(purpose)) return json({ error: "Unknown upload type." }, 400);
  if (!canUpload(role, purpose)) return json({ error: "Your account can't upload this kind of picture." }, 403);
  if (!rateLimit(`upload:${userId}`, uploadsPerHour(role), 60 * 60 * 1000)) return json({ error: "You've uploaded a lot of pictures in the last hour — please try again later." }, 429);

  const storage = getStorage();
  if (!storage.driver) return json({ error: storage.reason }, 503);

  // Refuse an oversize body BEFORE reading it, then check what actually arrived (the header can lie).
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_UPLOAD_BYTES) return json({ error: `That picture is too large. The limit is ${MAX_UPLOAD_BYTES / 1e6} MB.` }, 413);
  const body = Buffer.from(await request.arrayBuffer());

  const processed = await processImage(body, purpose);
  if (!processed.ok) return json({ error: processed.error }, processed.status);
  const { buffer, width, height, contentType } = processed.image;

  const month = new Date().toISOString().slice(0, 7).replace("-", "");
  const key = `images/${purpose}/${month}/${randomBytes(12).toString("hex")}.webp`;

  let url: string;
  try {
    ({ url } = await storage.driver.put(key, buffer, contentType));
  } catch (err) {
    console.error("[uploads] storage put failed:", (err as Error).message);
    return json({ error: "We couldn't save the picture just now — please try again." }, 502);
  }

  try {
    await prisma.uploadedImage.create({ data: { key, url, purpose, bytes: buffer.length, width, height, uploaderId: userId } });
  } catch (err) {
    console.error("[uploads] record failed:", (err as Error).message);
    await storage.driver.remove(key).catch(() => {}); // never leave a file we have no record of
    return json({ error: "We couldn't save the picture just now — please try again." }, 502);
  }
  return json({ url, width, height, bytes: buffer.length });
}
