"use client";

import { useState } from "react";
import Link from "next/link";
import { submitApplication, getApplicationStatus } from "@/lib/actions/partners";
import { partnerTypeLabel, applicationStatusLabel } from "@/lib/format";

const partnerTypes = [
  "ACCOMMODATION",
  "EXPERIENCE",
  "FOOD",
  "TRANSPORT",
  "CREATOR",
  "SELLER",
  "EVENT",
  "SPONSOR",
];

export default function ApplyPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [statusEmail, setStatusEmail] = useState("");
  const [statusResult, setStatusResult] = useState<any>(null);
  const [statusError, setStatusError] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    const result = await submitApplication(formData);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setSubmitted(true);
  }

  async function handleStatusCheck(e: React.FormEvent) {
    e.preventDefault();
    setStatusLoading(true);
    setStatusError("");
    setStatusResult(null);
    const result = await getApplicationStatus(statusEmail);
    setStatusLoading(false);
    if (result?.error) {
      setStatusError(result.error);
      return;
    }
    setStatusResult(result);
  }

  if (submitted) {
    return (
      <div className="px-6 py-24 text-center">
        <p className="font-display text-3xl text-stone">Application received.</p>
        <p className="mt-3 font-body text-stone/70">
          We&apos;ll be in touch. You can check its status any time on this page.
        </p>
        <Link
          href="/partners"
          className="focus-ring mt-8 inline-block rounded-full border border-stone/20 px-6 py-3 font-body text-sm text-stone hover:border-rust hover:text-rust"
        >
          Back to partners
        </Link>
      </div>
    );
  }

  return (
    <div className="px-6 py-16">
      <div className="mx-auto max-w-lg">
        <h1 className="font-display text-3xl text-stone">Apply to partner</h1>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
          <Field label="Business name">
            <input name="businessName" required className="input" />
          </Field>
          <Field label="Your name">
            <input name="contactName" required className="input" />
          </Field>
          <Field label="Email">
            <input name="email" type="email" required className="input" />
          </Field>
          <Field label="Phone">
            <input name="phone" type="tel" required className="input" />
          </Field>
          <Field label="Website (optional)">
            <input name="website" type="url" className="input" placeholder="https://" />
          </Field>
          <Field label="Partner type">
            <select name="partnerType" defaultValue="ACCOMMODATION" className="input">
              {partnerTypes.map((t) => (
                <option key={t} value={t}>
                  {partnerTypeLabel(t)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tell us about your business">
            <textarea name="message" required rows={5} minLength={20} className="input" />
          </Field>

          {error && <p className="font-body text-sm text-rust">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="focus-ring mt-2 rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment transition-colors hover:bg-rust-deep disabled:opacity-60"
          >
            {loading ? "Sending…" : "Submit application"}
          </button>
        </form>

        <div className="mt-16 border-t border-stone/10 pt-8">
          <p className="font-display text-xl text-stone">Check your application status</p>
          <form onSubmit={handleStatusCheck} className="mt-4 flex gap-3">
            <input
              type="email"
              required
              value={statusEmail}
              onChange={(e) => setStatusEmail(e.target.value)}
              placeholder="you@business.com"
              className="input flex-1"
            />
            <button
              type="submit"
              disabled={statusLoading}
              className="focus-ring rounded-full border border-stone/20 px-5 py-2 font-body text-sm text-stone hover:border-rust hover:text-rust disabled:opacity-60"
            >
              {statusLoading ? "Checking…" : "Check"}
            </button>
          </form>
          {statusError && <p className="mt-3 font-body text-sm text-rust">{statusError}</p>}
          {statusResult && (
            <div className="mt-4 rounded-sm border border-stone/10 p-4 font-body text-sm text-stone/80">
              <p>
                <strong>{statusResult.businessName}</strong> — {partnerTypeLabel(statusResult.partnerType)}
              </p>
              <p className="mt-1">Status: {applicationStatusLabel(statusResult.status)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-body text-sm text-stone/70">{label}</span>
      {children}
    </label>
  );
}
