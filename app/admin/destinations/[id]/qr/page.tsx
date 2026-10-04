import { notFound } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { rotateCheckinToken } from "@/lib/actions/checkin-admin";
import { buildCheckinUrl, checkinBaseUrl, isLocalUrl } from "@/lib/checkin-url";
import { CHECKIN_POINTS } from "@/lib/passport";
import PrintButton from "@/components/admin/PrintButton";

export const dynamic = "force-dynamic";

export default async function DestinationQrPage({ params }: { params: { id: string } }) {
  const destination = await prisma.destination.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, region: true, status: true, checkinToken: true },
  });
  if (!destination) notFound();

  const base = checkinBaseUrl();
  const token = destination.checkinToken;
  const url = base && token ? buildCheckinUrl(base, token) : null;
  const local = base ? isLocalUrl(base) : false;

  // Only draw a printable code for a real, public address.
  const svg =
    url && !local
      ? await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 1 })
      : null;

  return (
    <div>
      <div className="print:hidden">
        <Link href={`/admin/destinations/${destination.id}`} className="font-body text-sm text-stone/60 hover:text-rust">
          ← Back to {destination.name}
        </Link>
        <h1 className="mt-3 font-display text-3xl text-stone">Check-in plaque</h1>
      </div>

      {/* Problems that stop a plaque from working */}
      <div className="mt-6 flex max-w-xl flex-col gap-3 print:hidden">
        {!base && (
          <p className="rounded-sm border border-rust/40 bg-rust/10 p-4 font-body text-sm text-stone">
            <strong>Set NEXT_PUBLIC_APP_URL.</strong> A QR code must contain your public website address, and
            none is configured.
          </p>
        )}
        {base && local && (
          <p className="rounded-sm border border-rust/40 bg-rust/10 p-4 font-body text-sm text-stone">
            <strong>Don&apos;t print yet.</strong> NEXT_PUBLIC_APP_URL is <code>{base}</code>, which visitors&apos;
            phones can&apos;t reach. Set it to your real public site address, then come back — printed plaques
            would be useless.
          </p>
        )}
        {!token && (
          <p className="rounded-sm border border-ochre/50 bg-ochre/10 p-4 font-body text-sm text-stone">
            This destination doesn&apos;t have a check-in code yet.
          </p>
        )}
        {destination.status !== "PUBLISHED" && (
          <p className="rounded-sm border border-ochre/50 bg-ochre/10 p-4 font-body text-sm text-stone">
            This destination is a <strong>draft</strong> — the code only works once it&apos;s published.
          </p>
        )}
      </div>

      {/* The plaque */}
      {svg && (
        <div className="mt-8 flex flex-col items-start gap-6 print:mt-0 print:items-center">
          <div className="w-full max-w-md rounded-sm border-2 border-stone bg-white p-8 text-center text-stone print:max-w-none print:border-4">
            <p className="font-body text-xs tracking-widest text-rust">VISIT TAITA · TAITA PASSPORT</p>
            <p className="mt-3 font-display text-3xl leading-tight">{destination.name}</p>
            <p className="mt-1 font-body text-sm text-stone/60">{destination.region}</p>
            <div
              className="mx-auto mt-6 h-64 w-64 print:h-96 print:w-96 [&>svg]:h-full [&>svg]:w-full"
              role="img"
              aria-label={`QR code to check in at ${destination.name}`}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            <p className="mt-6 font-display text-xl">Scan to check in</p>
            <p className="mt-1 font-body text-sm text-stone/70">
              Earn {CHECKIN_POINTS} points on your Taita Passport
            </p>
          </div>

          <div className="print:hidden">
            <PrintButton />
          </div>
        </div>
      )}

      {/* Admin-only details and controls */}
      <div className="mt-10 flex max-w-xl flex-col gap-6 print:hidden">
        {url && (
          <div>
            <p className="font-body text-sm text-stone/70">Address encoded in the QR code</p>
            <p className="mt-1 break-all rounded-sm border border-stone/10 p-3 font-body text-xs text-stone/70">{url}</p>
          </div>
        )}

        <details className="rounded-sm border border-stone/10 p-4">
          <summary className="cursor-pointer font-body text-sm text-stone">
            {token ? "Replace this code…" : "Generate a code"}
          </summary>
          <div className="mt-3">
            {token && (
              <p className="font-body text-sm text-stone/70">
                A new code makes <strong>every plaque already printed for {destination.name} stop working</strong>.
                Do this if the code has leaked (for example, posted online) — then reprint.
              </p>
            )}
            <form
              action={async () => {
                "use server";
                await rotateCheckinToken(destination.id);
              }}
              className="mt-3"
            >
              <button
                type="submit"
                className="focus-ring rounded-full border border-rust px-5 py-2 font-body text-sm text-rust hover:bg-rust hover:text-parchment"
              >
                {token ? "Replace the code" : "Generate code"}
              </button>
            </form>
          </div>
        </details>
      </div>
    </div>
  );
}
