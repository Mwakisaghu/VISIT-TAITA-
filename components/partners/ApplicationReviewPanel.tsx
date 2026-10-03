"use client";

import { useState, useTransition } from "react";
import { reviewApplication, grantSellerAccess } from "@/lib/actions/partners";
import { grantPartnerAccess } from "@/lib/actions/partner-access";

type GrantResult = { error?: string; success?: boolean; name?: string } | null;

export default function ApplicationReviewPanel({
  applicationId,
  status,
  partnerType,
}: {
  applicationId: string;
  status: string;
  partnerType: string;
}) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [isPending, startTransition] = useTransition();
  const [grantResult, setGrantResult] = useState<GrantResult>(null);
  const [granting, setGranting] = useState(false);

  const isSeller = partnerType === "SELLER";
  const isListingPartner = partnerType === "ACCOMMODATION" || partnerType === "EXPERIENCE";

  function setStatus(next: "PENDING" | "APPROVED" | "REJECTED") {
    setCurrentStatus(next);
    startTransition(async () => {
      await reviewApplication(applicationId, next);
    });
  }

  async function handleGrant() {
    setGranting(true);
    setGrantResult(null);
    const result = isSeller
      ? await grantSellerAccess(applicationId)
      : await grantPartnerAccess(applicationId);
    setGrantResult(result);
    setGranting(false);
  }

  return (
    <div className="mt-8 flex flex-col gap-6">
      <div>
        <p className="font-body text-sm text-stone/70">Status</p>
        <div className="mt-2 flex gap-2">
          {(["PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
            <button
              key={s}
              type="button"
              disabled={isPending}
              onClick={() => setStatus(s)}
              className={`focus-ring rounded-full border px-4 py-2 font-body text-sm transition-colors disabled:opacity-60 ${
                currentStatus === s
                  ? "border-rust bg-rust text-parchment"
                  : "border-stone/20 text-stone hover:border-rust hover:text-rust"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {currentStatus === "APPROVED" && (isSeller || isListingPartner) && (
        <div>
          <p className="font-body text-sm text-stone/70">
            {isSeller
              ? "Grant marketplace access to this applicant if they already have a Visit Taita account under the same email."
              : "Grant partner access (manage their own stay or experience listings) if they already have a Visit Taita account under the same email."}
          </p>
          <button
            type="button"
            onClick={handleGrant}
            disabled={granting}
            className="focus-ring mt-3 rounded-full bg-canopy px-5 py-2 font-body text-sm text-parchment hover:bg-canopy-deep disabled:opacity-60"
          >
            {granting ? "Checking…" : isSeller ? "Grant seller access" : "Grant partner access"}
          </button>
          {grantResult?.success && (
            <p className="mt-2 font-body text-sm text-canopy">
              {grantResult.name} now has {isSeller ? "seller" : "partner"} access.
            </p>
          )}
          {grantResult?.error && (
            <p className="mt-2 font-body text-sm text-rust">{grantResult.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
