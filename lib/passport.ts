import { randomBytes } from "node:crypto";

// Passport check-in rules, kept in one place so they're easy to tune.

/** Points for the first verified check-in at a destination. */
export const CHECKIN_POINTS = 10;

/** GPS fixes worse than this (metres of reported accuracy) are rejected as too imprecise. */
export const MAX_GPS_ACCURACY_M = 200;

/** How much of the reported GPS error we forgive when measuring distance. */
export const GPS_ACCURACY_SLACK_M = 100;

/** Great-circle distance in metres (haversine). */
export function distanceMetres(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** True if a fix is close enough, giving some benefit of the doubt for GPS error. */
export function isWithinCheckinRadius(opts: { distanceM: number; accuracyM: number; radiusM: number }) {
  const slack = Math.min(Math.max(opts.accuracyM, 0), GPS_ACCURACY_SLACK_M);
  return Math.max(0, opts.distanceM - slack) <= opts.radiusM;
}

export function formatDistance(metres: number) {
  return metres < 1000 ? `${Math.max(10, Math.round(metres / 10) * 10)} m` : `${(metres / 1000).toFixed(1)} km`;
}

/** Unguessable URL-safe token for a destination's QR plaque (96 bits). */
export function generateCheckinToken() {
  return randomBytes(12).toString("base64url");
}
