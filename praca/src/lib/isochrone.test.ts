import { describe, expect, it } from "vitest";
import { distanceMeters } from "./geo-math";
import { circleRing, fallbackIsochrone, isoKey } from "./isochrone";

describe("isochrone fallback", () => {
  it("builds a closed ring at the requested radius", () => {
    const ring = circleRing(38.72, -9.14, 1);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    for (const [lng, lat] of ring) expect(Math.abs(distanceMeters(38.72, -9.14, lat, lng) - 1000)).toBeLessThan(15);
  });
  it("15 min on foot is 1.2 km, flagged approximate", () => {
    const f = fallbackIsochrone(38.72, -9.14, "foot-walking", 15);
    expect(f.features[0]!.properties.approximate).toBe(true);
    const [lng, lat] = f.features[0]!.geometry.coordinates[0]![0]!;
    expect(Math.abs(distanceMeters(38.72, -9.14, lat, lng) - 1200)).toBeLessThan(20);
  });
  it("cache key rounds nearby points together", () => expect(isoKey(38.7201, -9.1399, "driving-car", 10)).toBe(isoKey(38.7204, -9.1402, "driving-car", 10)));
});
