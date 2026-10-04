// Shared rules for the Taita Field Crew (creators). No Node-only imports, so safe in client components.
import { safeHttpUrl } from "@/lib/url";

/** Bump when the creator guidelines change materially; stored with each application. */
export const CREATOR_TERMS_VERSION = "2026-10";

export const CREATOR_LIMITS = {
  nameMin: 2,
  nameMax: 60,
  bioMin: 50,
  bioMax: 600,
  pitchMin: 40,
  pitchMax: 1000,
  locationMax: 80,
  followerNoteMax: 200,
  maxLinks: 5,
  reasonMax: 500,
} as const;

export const CREATOR_TRACKS = ["LOCAL_VOICE", "VISITING_CREATOR"] as const;
export type CreatorTrackValue = (typeof CREATOR_TRACKS)[number];

export const TRACK_LABELS: Record<CreatorTrackValue, string> = {
  LOCAL_VOICE: "Local Voice",
  VISITING_CREATOR: "Visiting Creator",
};

export const TRACK_BLURBS: Record<CreatorTrackValue, string> = {
  LOCAL_VOICE:
    "You live in or come from Taita Taveta and want to tell its stories. No audience size needed — a portfolio is optional.",
  VISITING_CREATOR:
    "You create travel, wildlife, food, sport or culture content from outside the region. A portfolio link is required.",
};

export const CREATOR_SPECIALTIES = [
  "PHOTOGRAPHY",
  "VIDEO",
  "WRITING",
  "AUDIO",
  "SOCIAL",
  "ILLUSTRATION",
] as const;
export type CreatorSpecialtyValue = (typeof CREATOR_SPECIALTIES)[number];

export const SPECIALTY_LABELS: Record<CreatorSpecialtyValue, string> = {
  PHOTOGRAPHY: "Photography",
  VIDEO: "Video",
  WRITING: "Writing",
  AUDIO: "Audio & podcasts",
  SOCIAL: "Social content",
  ILLUSTRATION: "Illustration",
};

export function trackLabel(track: string) {
  return TRACK_LABELS[track as CreatorTrackValue] ?? track;
}
export function specialtyLabel(s: string) {
  return SPECIALTY_LABELS[s as CreatorSpecialtyValue] ?? s;
}

/** /creators/<slug> must never collide with the static /creators/apply page. */
export const RESERVED_CREATOR_SLUGS = ["apply"];

export function slugifyName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 50)
    .replace(/-$/, "");
}

/**
 * Parses links typed one per line (or separated by commas/spaces). People write
 * "myportfolio.com" without a scheme, so https:// is added; anything that still
 * isn't a real http(s) address with a dotted host is reported back as invalid.
 */
export function parseLinks(raw: string): { links: string[]; invalid: string[] } {
  const links: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const piece of raw.split(/[\s,;]+/)) {
    const text = piece.trim();
    if (!text) continue;
    const candidate = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
    const safe = safeHttpUrl(candidate);
    let ok = false;
    if (safe) {
      try {
        ok = new URL(safe).hostname.includes(".");
      } catch {
        ok = false;
      }
    }
    if (!safe || !ok) {
      invalid.push(text);
      continue;
    }
    if (!seen.has(safe)) {
      seen.add(safe);
      links.push(safe);
    }
  }
  return { links, invalid };
}

/** "Jane Wanjiru" -> "JW" for the avatar placeholder. */
export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/** Short label for a link on a profile, e.g. "instagram.com". */
export function linkLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
