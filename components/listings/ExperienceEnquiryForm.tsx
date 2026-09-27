"use client";

import { useState } from "react";
import { submitExperienceEnquiry } from "@/lib/actions/enquiries";

export default function ExperienceEnquiryForm({ experienceId }: { experienceId: string }) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    const result = await submitExperienceEnquiry(experienceId, formData);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-sm border border-canopy/30 bg-canopy/10 p-4">
        <p className="font-display text-lg text-stone">Enquiry sent.</p>
        <p className="mt-1 font-body text-sm text-stone/70">
          The guide will reach out on the contact details you gave.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-body text-xs text-stone/50">Preferred date</span>
          <input name="preferredDate" type="date" className="input" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-body text-xs text-stone/50">Party size</span>
          <input name="partySize" type="number" min={1} className="input" />
        </label>
      </div>
      <input name="name" required placeholder="Your name" className="input" />
      <input name="email" type="email" required placeholder="Email" className="input" />
      <input name="phone" type="tel" required placeholder="Phone" className="input" />
      <textarea
        name="message"
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
    </form>
  );
}
