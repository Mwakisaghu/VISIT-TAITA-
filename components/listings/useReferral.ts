"use client";

import { useEffect, useState } from "react";
import { parseReferral, referralValue } from "@/lib/referral";

/**
 * The validated `?from=` value of the current page, or "" if there isn't one. It is read in the browser
 * (not on the server) so the listing page itself stays cached for everyone.
 */
export function useReferral(): string {
  const [referral, setReferral] = useState("");
  useEffect(() => {
    try {
      const parsed = parseReferral(new URLSearchParams(window.location.search).get("from"));
      setReferral(parsed ? referralValue(parsed) : "");
    } catch {
      setReferral("");
    }
  }, []);
  return referral;
}
