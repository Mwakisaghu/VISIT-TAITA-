"use client";

import ConsentNote from "@/components/legal/ConsentNote";

import { useState } from "react";
import { useReferral } from "@/components/listings/useReferral";
import { submitAccommodationEnquiry } from "@/lib/actions/enquiries";

export default function AccommodationEnquiryForm({ accommodationId }: { accommodationId: string }) {
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
      const result = await submitAccommodationEnquiry(accommodationId, formData);
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
        <p className="mt-1 font-body text-sm text-stone/70">
          The host will reach out on the contact details you gave.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {referral && <input type="hidden" name="from" value={referral} />}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-body text-xs text-stone/70">Check-in</span>
          <input name="checkIn" type="date" className="input" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-body text-xs text-stone/70">Check-out</span>
          <input name="checkOut" type="date" className="input" />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="font-body text-xs text-stone/70">Guests</span>
        <input name="guests" type="number" min={1} className="input" />
      </label>
      <input name="name" required placeholder="Your name" className="input" />
      <input name="email" type="email" required placeholder="Email" className="input" />
      <input name="phone" type="tel" required placeholder="Phone" className="input" />
      <textarea
        name="message"
        required
        minLength={10}
        rows={3}
        placeholder="Tell them a bit about your stay…"
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
