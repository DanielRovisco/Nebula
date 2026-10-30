export type Ring = [number, number][];

export const MAX_ZONES = 5;
export const MAX_VERTICES = 80;

const inPortugal = (lng: number, lat: number) => lng >= -35 && lng <= -5 && lat >= 29 && lat <= 43;

/** Compact URL form: rings joined by "|", vertices by ";", "lng,lat" with 4 decimals (~10 m). */
export function encodeZones(zones: Ring[]): string {
  return zones.map((r) => r.map(([x, y]) => `${x.toFixed(4)},${y.toFixed(4)}`).join(";")).join("|");
}

/** Strict parser: invalid zones are dropped, never thrown. */
export function decodeZones(raw: string | undefined): Ring[] {
  if (!raw) return [];
  const out: Ring[] = [];
  for (const part of raw.split("|").slice(0, MAX_ZONES)) {
    const ring: Ring = [];
    for (const v of part.split(";").slice(0, MAX_VERTICES)) {
      const [x, y] = v.split(",").map(Number);
      if (x === undefined || y === undefined || !Number.isFinite(x) || !Number.isFinite(y) || !inPortugal(x, y)) {
        ring.length = 0;
        break;
      }
      ring.push([x, y]);
    }
    if (ring.length >= 3) out.push(ring);
  }
  return out;
}

/** GeoJSON MultiPolygon with closed rings, for PostGIS ST_GeomFromGeoJSON. */
export function zonesToMultiPolygon(zones: Ring[]) {
  return {
    type: "MultiPolygon" as const,
    coordinates: zones.map((r) => {
      const closed = r[0]![0] === r[r.length - 1]![0] && r[0]![1] === r[r.length - 1]![1] ? r : [...r, r[0]!];
      return [closed];
    }),
  };
}

/** Planar bbox of all zones, [w,s,e,n]. */
export function zonesBounds(zones: Ring[]): [number, number, number, number] | undefined {
  const pts = zones.flat();
  if (!pts.length) return undefined;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
