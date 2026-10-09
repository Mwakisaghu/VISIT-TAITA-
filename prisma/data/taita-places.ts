// Real places in Taita Taveta, with positions and altitudes researched from public sources (see docs/place-data-sources.md).
// "sourced" = the number comes from a published source. "approximate" = the position is estimated from descriptions and still needs an on-the-ground check.
// The numbers live in taita-places.json (the one source of truth): this file only gives them types for the app and the seed.
// scripts/set-place-geography.mjs reads the same JSON file.
export type Quality = "sourced" | "approximate";
export type PlaceGeo = {
  slug: string; name: string; category: "WILD" | "CULTURE" | "ADVENTURE" | "FOOD" | "SPORT" | "PEOPLE"; region: string; blurb: string;
  latitude: number; longitude: number; altitudeM: number | null;
  position: Quality; altitude: Quality | "none"; note?: string; sample?: boolean;
};

import raw from "./taita-places.json";

export const PLACES = raw.places as PlaceGeo[];

/** Where sample stays and experiences sit (all are sample listings; hosts and prices are invented, positions follow the places above). */
export const SAMPLE_GEO = raw.sampleGeo as Record<string, { latitude: number; longitude: number; altitudeM: number }>;
