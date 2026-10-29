const R = 6371008.8;
const rad = (d: number) => (d * Math.PI) / 180;

/** Haversine distance in metres. */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export type Ring = [number, number][];

/** Ray-casting point-in-ring test ([lng, lat]). */
export function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export type PolygonCoords = Ring[]; // outer ring + holes

export function pointInPolygon(lng: number, lat: number, poly: PolygonCoords): boolean {
  if (!pointInRing(lng, lat, poly[0]!)) return false;
  for (let i = 1; i < poly.length; i++) if (pointInRing(lng, lat, poly[i]!)) return false;
  return true;
}
