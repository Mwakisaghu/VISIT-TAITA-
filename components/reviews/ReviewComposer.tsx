"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  deleteMyReview,
  getMyReviewState,
  submitReview,
  type MyReviewState,
} from "@/lib/actions/reviews";
import { REVIEW_MAX_BODY, REVIEW_MAX_TITLE, REVIEW_MIN_BODY, type ReviewKind } from "@/lib/reviews";

type Mine = NonNullable<MyReviewState["review"]>;

/**
 * The signed-in visitor's own review box. It loads their state on the client
 * (rather than reading the session on the server) so the listing page itself
 * can stay cached.
 */
export default function ReviewComposer({
  kind,
  listingId,
  listingName,
}: {
  kind: ReviewKind;
  listingId: string;
  listingName: string;
}) {
  const { status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const [state, setState] = useState<MyReviewState | null>(null);
  const [rating, setRating] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    getMyReviewState(kind, listingId)
      .then((s) => {
        if (cancelled) return;
        setState(s);
        setRating(s.review?.rating ?? 0);
      })
      .catch(() => !cancelled && setState({ canReview: false, reason: "unavailable" }));
    return () => {
      cancelled = true;
    };
  }, [status, kind, listingId]);

  if (status === "loading") return null;

  if (status === "unauthenticated") {
    return (
      <div className="rounded-sm border border-stone/10 p-5">
        <p className="font-display text-lg text-stone">Been here?</p>
        <p className="mt-1 font-body text-sm text-stone/70">Sign in to share your experience of {listingName}.</p>
        <Link
          href={`/login?next=${encodeURIComponent(pathname ?? "/")}`}
          className="focus-ring mt-4 inline-block rounded-full bg-rust px-6 py-2.5 font-body text-sm text-parchment hover:bg-rust-deep"
        >
          Sign in to write a review
        </Link>
      </div>
    );
  }

  if (!state) return <p className="font-body text-sm text-stone/40">Loading…</p>;

  if (!state.canReview) {
    return state.reason === "own" ? (
      <p className="font-body text-sm text-stone/60">You can&apos;t review your own listing.</p>
    ) : null;
  }

  const mine = state.review ?? null;

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    try {
      const res = await submitReview(kind, listingId, formData);
      if (res.error) {
        setMessage({ kind: "error", text: res.error });
        return;
      }
      const next: Mine = {
        rating: Number(formData.get("rating")),
        title: String(formData.get("title") ?? "").trim() || null,
        body: String(formData.get("body") ?? "").trim(),
        status: "PENDING",
        rejectionReason: null,
        verified: mine?.verified ?? false,
      };
      setState({ canReview: true, review: next });
      setMessage({ kind: "ok", text: "Thank you! Your review will appear once it has been approved." });
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: "Something went wrong — please try again." });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Delete your review?")) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await deleteMyReview(kind, listingId);
      if (res.error) {
        setMessage({ kind: "error", text: res.error });
        return;
      }
      setState({ canReview: true, review: null });
      setRating(0);
      setMessage({ kind: "ok", text: "Your review was deleted." });
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: "Something went wrong — please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-sm border border-stone/10 p-5 sm:p-6">
      <p className="font-display text-lg text-stone">{mine ? "Your review" : `Review ${listingName}`}</p>

      {mine?.status === "PENDING" && (
        <p className="mt-2 rounded-sm bg-ochre/15 p-3 font-body text-sm text-stone">
          Your review is waiting for approval. It will appear on this page once it&apos;s approved.
        </p>
      )}
      {mine?.status === "APPROVED" && (
        <p className="mt-2 rounded-sm bg-canopy/10 p-3 font-body text-sm text-canopy">
          Your review is published. Editing it will send it for approval again.
        </p>
      )}
      {mine?.status === "REJECTED" && (
        <p className="mt-2 rounded-sm bg-rust/10 p-3 font-body text-sm text-stone">
          Your review wasn&apos;t approved
          {mine.rejectionReason ? `: ${mine.rejectionReason}` : "."} You can edit it and submit it again.
        </p>
      )}

      {/* The fields are uncontrolled, so remount them when a review appears or is deleted —
          otherwise deleting would leave the old text sitting in the boxes. */}
      <form key={mine ? "existing" : "new"} onSubmit={save} className="mt-4 flex flex-col gap-4">
        <fieldset>
          <legend className="font-body text-sm text-stone/70">Your rating</legend>
          <div className="mt-1 flex gap-1" role="group" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={rating === n}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                onClick={() => setRating(n)}
                className={`focus-ring rounded-sm px-1 text-3xl leading-none transition-colors ${
                  n <= rating ? "text-ochre" : "text-stone/20 hover:text-ochre/60"
                }`}
              >
                ★
              </button>
            ))}
          </div>
          <input type="hidden" name="rating" value={rating || ""} />
        </fieldset>

        <label className="flex flex-col gap-1">
          <span className="font-body text-sm text-stone/70">Headline (optional)</span>
          <input
            name="title"
            defaultValue={mine?.title ?? ""}
            maxLength={REVIEW_MAX_TITLE}
            className="input"
            placeholder="Sum it up in a few words"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-body text-sm text-stone/70">Your experience</span>
          <textarea
            name="body"
            defaultValue={mine?.body ?? ""}
            required
            minLength={REVIEW_MIN_BODY}
            maxLength={REVIEW_MAX_BODY}
            rows={5}
            className="input"
            placeholder="What was it like? What would you tell another visitor?"
          />
        </label>

        {message && (
          <p role={message.kind === "error" ? "alert" : "status"} className={`font-body text-sm ${message.kind === "error" ? "text-rust" : "text-canopy"}`}>
            {message.text}
          </p>
        )}

        <p className="font-body text-xs text-stone/50">Your review will be shown publicly with your first name and last initial.</p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy || rating === 0}
            className="focus-ring rounded-full bg-rust px-6 py-2.5 font-body text-sm text-parchment hover:bg-rust-deep disabled:opacity-60"
          >
            {busy ? "Saving…" : mine ? "Save changes" : "Submit review"}
          </button>
          {mine && (
            <button
              type="button"
              disabled={busy}
              onClick={remove}
              className="focus-ring font-body text-sm text-stone/50 hover:text-rust"
            >
              Delete my review
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
