import type { Ring } from "./geo-math";

export const ISO_MODES = ["foot-walking", "cycling-regular", "driving-car"] as const;
export type IsoMode = (typeof ISO_MODES)[number];
export const ISO_MINUTES = [5, 10, 15, 20, 30] as const;

/** Straight-line speeds (km/h) used only by the fallback. They overstate real reach, so the fallback is labelled an approximation. */
export const FALLBACK_SPEED_KMH: Record<IsoMode, number> = { "foot-walking": 4.8, "cycling-regular": 14, "driving-car": 30 };

/** Circle of `km` radius around a point, as a closed [lng, lat] ring. */
export function circleRing(lat: number, lng: number, km: number, steps = 64): Ring {
  const out: Ring = [];
  const dLat = km / 111.32;
  const dLng = km / (111.32 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i < steps; i++) {
    const a = (2 * Math.PI * i) / steps;
    out.push([Math.round((lng + dLng * Math.cos(a)) * 1e6) / 1e6, Math.round((lat + dLat * Math.sin(a)) * 1e6) / 1e6]);
  }
  out.push(out[0]!);
  return out;
}

export function fallbackIsochrone(lat: number, lng: number, mode: IsoMode, minutes: number) {
  const km = (FALLBACK_SPEED_KMH[mode] * minutes) / 60;
  return {
    type: "FeatureCollection" as const,
    features: [{ type: "Feature" as const, properties: { value: minutes * 60, approximate: true }, geometry: { type: "Polygon" as const, coordinates: [circleRing(lat, lng, km)] } }],
  };
}

/** Rounds to ~110 m so nearby requests share a cache entry. */
export const isoKey = (lat: number, lng: number, mode: IsoMode, minutes: number) => `${lat.toFixed(3)}:${lng.toFixed(3)}:${mode}:${minutes}`;
