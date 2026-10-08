import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import DeleteAccountForm from "@/components/account/DeleteAccountForm";
import ResendVerificationButton from "@/components/account/ResendVerificationButton";
import UnsubscribeButton from "@/components/account/UnsubscribeButton";
import { getDeletionBlockers } from "@/lib/account-data";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Your account" };

// Personal to the signed-in person — never cached.
export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <p className="font-body text-sm text-rust">Visit Taita</p>
        <h1 className="mt-1 font-display text-4xl text-stone sm:text-5xl">Your account</h1>
        {children}
      </div>
    </div>
  );
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return (
      <Shell>
        <p className="mt-4 font-body text-stone/70">Sign in to manage your account and your data.</p>
        <Link href="/login?next=%2Faccount" className="focus-ring mt-6 inline-block rounded-full bg-rust px-7 py-3 font-body text-sm text-parchment hover:bg-rust-deep">
          Sign in
        </Link>
      </Shell>
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, createdAt: true, termsAcceptedAt: true, termsVersion: true, emailVerifiedAt: true },
  });
  if (!user) {
    return (
      <Shell>
        <p className="mt-4 font-body text-stone/70">This account no longer exists.</p>
      </Shell>
    );
  }

  const [subscriber, blockers] = await Promise.all([
    prisma.newsletterSubscriber.findUnique({ where: { email: user.email }, select: { createdAt: true, status: true, confirmedAt: true } }),
    getDeletionBlockers({ id: user.id, role: user.role }),
  ]);

  return (
    <Shell>
      <section className="mt-10">
        <h2 className="font-display text-2xl text-stone">Your details</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="font-body text-xs text-stone/50">Name</dt>
            <dd className="font-body text-stone">{user.name}</dd>
          </div>
          <div>
            <dt className="font-body text-xs text-stone/50">Email</dt>
            <dd className="font-body text-stone">{user.email}</dd>
          </div>
          <div>
            <dt className="font-body text-xs text-stone/50">Member since</dt>
            <dd className="font-body text-stone">{formatDate(user.createdAt)}</dd>
          </div>
          <div>
            <dt className="font-body text-xs text-stone/50">Terms accepted</dt>
            <dd className="font-body text-stone">
              {user.termsAcceptedAt ? `${formatDate(user.termsAcceptedAt)} (version ${user.termsVersion ?? "—"})` : "Before we recorded this"}
            </dd>
          </div>
        </dl>
        <p className="mt-4 font-body text-sm text-stone/60">
          To correct your details, <Link href="/contact" className="underline hover:text-rust">contact us</Link>.
        </p>
      </section>

      <section className="mt-12 border-t border-stone/10 pt-10">
        <h2 className="font-display text-2xl text-stone">Email address</h2>
        {user.emailVerifiedAt ? (
          <p className="mt-3 font-body text-stone/70">Verified on {formatDate(user.emailVerifiedAt)}.</p>
        ) : (
          <>
            <p className="mt-3 max-w-prose font-body text-stone/70">
              Your email address isn&apos;t verified yet. We sent a link to <strong>{user.email}</strong> when you registered — click it to verify. Until then you can&apos;t write reviews or apply to the Field Crew.
            </p>
            <div className="mt-4">
              <ResendVerificationButton />
            </div>
          </>
        )}
      </section>

      <section className="mt-12 border-t border-stone/10 pt-10">
        <h2 className="font-display text-2xl text-stone">Newsletter</h2>
        {subscriber && subscriber.status === "ACTIVE" && subscriber.confirmedAt ? (
          <>
            <p className="mt-3 font-body text-stone/70">You&apos;re subscribed (since {formatDate(subscriber.confirmedAt)}).</p>
            <div className="mt-4">
              <UnsubscribeButton />
            </div>
          </>
        ) : subscriber && subscriber.status === "PENDING" ? (
          <>
            <p className="mt-3 max-w-prose font-body text-stone/70">We&apos;ve emailed you a link to confirm your address. Click it to start receiving the letter.</p>
            <div className="mt-4">
              <UnsubscribeButton />
            </div>
          </>
        ) : subscriber && subscriber.status === "ACTIVE" ? (
          <>
            <p className="mt-3 max-w-prose font-body text-stone/70">
              You signed up before we asked people to confirm, so we won&apos;t email you until you do. Sign up again from the bottom of any page and we&apos;ll send you a confirmation link.
            </p>
            <div className="mt-4">
              <UnsubscribeButton />
            </div>
          </>
        ) : (
          <p className="mt-3 font-body text-stone/70">You&apos;re not subscribed to our newsletter.</p>
        )}
      </section>

      <section className="mt-12 border-t border-stone/10 pt-10">
        <h2 className="font-display text-2xl text-stone">My bookings</h2>
        <p className="mt-3 max-w-prose font-body text-stone/70">
          Experiences you have booked, what you paid, and any refunds. <Link href="/account/bookings" className="text-rust underline">See my bookings</Link>.
        </p>
      </section>

      <section className="mt-12 border-t border-stone/10 pt-10">
        <h2 className="font-display text-2xl text-stone">My tickets</h2>
        <p className="mt-3 max-w-prose font-body text-stone/70">
          Tickets for events, with their QR codes. <Link href="/account/tickets" className="text-rust underline">See my tickets</Link>.
        </p>
      </section>

      <section className="mt-12 border-t border-stone/10 pt-10">
        <h2 className="font-display text-2xl text-stone">Download my data</h2>
        <p className="mt-3 max-w-prose font-body text-stone/70">
          Get a copy of the personal data linked to your account — your details, Passport, reviews, enquiries, orders and any creator profile — as a file you can keep.
          It does not include your password (we only store a one-way hash) or our internal notes.
        </p>
        <a
          href="/api/account/export"
          download
          className="focus-ring mt-4 inline-block rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment hover:bg-rust-deep"
        >
          Download my data
        </a>
      </section>

      <section className="mt-12 border-t border-stone/10 pt-10">
        <h2 className="font-display text-2xl text-stone">Delete my account</h2>
        <p className="mt-3 max-w-prose font-body text-stone/70">This permanently removes your account. Here is exactly what happens:</p>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="font-body text-sm font-semibold text-stone">Deleted</p>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 font-body text-sm text-stone/70">
              <li>Your account, Passport, points, badges and vouchers (unused vouchers are cancelled)</li>
              <li>Your reviews</li>
              <li>Your creator profile, applications and Field Notes, and your missions</li>
              <li>Your newsletter subscription</li>
            </ul>
          </div>
          <div>
            <p className="font-body text-sm font-semibold text-stone">Kept, without your details</p>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 font-body text-sm text-stone/70">
              <li>Your enquiries, as anonymous records for the host</li>
              <li>Shop orders, as anonymous payment records</li>
              <li>Stories you wrote, without your name</li>
            </ul>
          </div>
        </div>

        {blockers.length > 0 ? (
          <div role="note" className="mt-6 rounded-sm border border-ochre/60 bg-ochre/10 p-4">
            <p className="font-body text-sm font-semibold text-stone">You can&apos;t delete this account just yet</p>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 font-body text-sm text-stone/80">
              {blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <p className="mt-3 font-body text-sm text-stone/70">
              Need help? <Link href="/contact" className="underline hover:text-rust">Contact us</Link>.
            </p>
          </div>
        ) : (
          <div className="mt-6">
            <DeleteAccountForm />
          </div>
        )}
        <p className="mt-6 font-body text-xs text-stone/50">
          More in our <Link href="/privacy" className="underline hover:text-rust">Privacy Policy</Link>.
        </p>
      </section>
    </Shell>
  );
}
