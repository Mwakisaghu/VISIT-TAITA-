import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions, ADMIN_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-sm border border-stone/10 p-5">
      <p className="font-display text-3xl text-stone">{value}</p>
      <p className="mt-1 font-body text-sm text-stone/60">{label}</p>
    </div>
  );
}

export default async function PartnerDashboardPage() {
  const session = await getServerSession(authOptions);
  const user = session!.user;
  const isAdmin = ADMIN_ROLES.includes(user.role);
  const showSeller = isAdmin || user.role === "SELLER";
  const showListings = isAdmin || user.role === "PARTNER";
  const ownerId = user.id;

  const [
    productTotal,
    productPublished,
    productDraft,
    accommodationTotal,
    experienceTotal,
    stayEnquiries,
    experienceEnquiries,
  ] = await Promise.all([
    showSeller ? prisma.product.count({ where: { sellerId: ownerId } }) : 0,
    showSeller ? prisma.product.count({ where: { sellerId: ownerId, status: "PUBLISHED" } }) : 0,
    showSeller ? prisma.product.count({ where: { sellerId: ownerId, status: "DRAFT" } }) : 0,
    showListings ? prisma.accommodation.count({ where: { ownerId } }) : 0,
    showListings ? prisma.experience.count({ where: { ownerId } }) : 0,
    showListings
      ? prisma.accommodationEnquiry.count({ where: { status: "NEW", accommodation: { ownerId } } })
      : 0,
    showListings
      ? prisma.experienceEnquiry.count({ where: { status: "NEW", experience: { ownerId } } })
      : 0,
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Welcome back</h1>
      <p className="mt-2 font-body text-stone/60">Here&apos;s how your Visit Taita listings are doing.</p>

      {showSeller && (
        <div className="mt-8">
          <p className="font-body text-sm text-stone/50">Taita Made</p>
          <div className="mt-3 grid grid-cols-3 gap-4">
            <Stat value={productTotal} label="Total listings" />
            <Stat value={productPublished} label="Live in shop" />
            <Stat value={productDraft} label="Awaiting review" />
          </div>
        </div>
      )}

      {showListings && (
        <div className="mt-10">
          <p className="font-body text-sm text-stone/50">Stay &amp; Experiences</p>
          <div className="mt-3 grid grid-cols-3 gap-4">
            <Stat value={accommodationTotal} label="Accommodations" />
            <Stat value={experienceTotal} label="Experiences" />
            <Link href="/partner/enquiries" className="focus-ring rounded-sm transition-opacity hover:opacity-80">
              <Stat value={stayEnquiries + experienceEnquiries} label="New enquiries" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
