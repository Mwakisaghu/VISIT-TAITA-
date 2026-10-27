"use client";

import ConsentNote from "@/components/legal/ConsentNote";

import { useState } from "react";
import { useReferral } from "@/components/listings/useReferral";
import { submitExperienceEnquiry } from "@/lib/actions/enquiries";
import SpamGuard from "@/components/forms/SpamGuard";

export default function ExperienceEnquiryForm({ experienceId }: { experienceId: string }) {
  const referral = useReferral();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    try {
      const result = await submitExperienceEnquiry(experienceId, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Something went wrong sending your enquiry — please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-sm border border-canopy/30 bg-canopy/10 p-4">
        <p className="font-display text-lg text-stone">Enquiry sent.</p>
        <p className="mt-1 font-body text-sm text-stone/80">
          The guide will reach out on the contact details you gave.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <SpamGuard />
      {referral && <input type="hidden" name="from" value={referral} />}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-body text-xs text-stone/80">Preferred date</span>
          <input name="preferredDate" type="date" className="input" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-body text-xs text-stone/80">Party size</span>
          <input name="partySize" type="number" min={1} className="input" />
        </label>
      </div>
      <input name="name" required placeholder="Your name" aria-label="Your name" autoComplete="name" className="input" />
      <input name="email" type="email" required placeholder="Email" aria-label="Your email address" autoComplete="email" className="input" />
      <input name="phone" type="tel" required placeholder="Phone" aria-label="Your phone number" autoComplete="tel" className="input" />
      <textarea
        name="message"
        aria-label="Your message"
        required
        minLength={10}
        rows={3}
        placeholder="Tell them a bit about what you're after…"
        className="input"
      />

      {error && <p className="font-body text-sm text-rust">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="focus-ring rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment transition-colors hover:bg-rust-deep disabled:opacity-60"
      >
        {loading ? "Sending…" : "Send enquiry"}
      </button>
      <ConsentNote kind="enquiry" />
    </form>
  );
}
