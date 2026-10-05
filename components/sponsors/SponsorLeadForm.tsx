"use client";

import ConsentNote from "@/components/legal/ConsentNote";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { submitSponsorLead } from "@/lib/actions/sponsor-leads";

export default function SponsorLeadForm({
  packages,
}: {
  packages: { slug: string; name: string }[];
}) {
  const searchParams = useSearchParams();
  const requested = searchParams.get("package") ?? "";

  const [selected, setSelected] = useState(
    packages.some((p) => p.slug === requested) ? requested : ""
  );
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Package cards link to /sponsors?package=slug#enquire — follow that choice
  // even though the form stays mounted between navigations.
  useEffect(() => {
    if (packages.some((p) => p.slug === requested)) setSelected(requested);
  }, [requested, packages]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    try {
      const result = await submitSponsorLead(formData);
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
      <div className="rounded-sm border border-canopy/30 bg-canopy/10 p-6">
        <p className="font-display text-2xl text-stone">Thank you — we&apos;ve got your enquiry.</p>
        <p className="mt-2 font-body text-stone/70">
          Someone from the Visit Taita team will be in touch on the contact details you gave.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="font-body text-sm text-stone/70">Company</span>
          <input name="companyName" required maxLength={120} className="input" autoComplete="organization" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-body text-sm text-stone/70">Your name</span>
          <input name="contactName" required maxLength={120} className="input" autoComplete="name" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-body text-sm text-stone/70">Email</span>
          <input name="email" type="email" required className="input" autoComplete="email" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-body text-sm text-stone/70">Phone</span>
          <input name="phone" type="tel" required className="input" autoComplete="tel" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-body text-sm text-stone/70">Website (optional)</span>
          <input name="website" className="input" placeholder="yourcompany.com" inputMode="url" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-body text-sm text-stone/70">Budget range (optional)</span>
          <input name="budgetRange" maxLength={120} className="input" placeholder="e.g. KSh 1–2M" />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="font-body text-sm text-stone/70">Package you&apos;re interested in</span>
        <select
          name="packageSlug"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="input"
        >
          <option value="">Not sure yet — let&apos;s talk</option>
          {packages.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-body text-sm text-stone/70">What would you like to achieve?</span>
        <textarea
          name="message"
          required
          minLength={20}
          maxLength={2000}
          rows={5}
          className="input"
          placeholder="Tell us about your business and what you'd like a partnership with Taita to do for it."
        />
      </label>

      {/* Honeypot — hidden from people and assistive tech; bots fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Leave this field empty
          <input name="companyWebsite" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {error && <p className="font-body text-sm text-rust">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="focus-ring w-fit rounded-full bg-rust px-8 py-3 font-body text-sm text-parchment transition-colors hover:bg-rust-deep disabled:opacity-60"
      >
        {loading ? "Sending…" : "Send enquiry"}
      </button>
      <ConsentNote kind="lead" />
    </form>
  );
}
