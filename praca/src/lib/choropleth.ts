export interface GeoFeature {
  key: string;
  name: string;
  href: string;
  value: number | null;
  /** GeoJSON Polygon/MultiPolygon coordinates, [lng, lat] */
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] };
}

export interface ProjectedFeature extends Omit<GeoFeature, "geometry"> {
  d: string;
  bin: number | null;
}

/** Equirectangular projection corrected by cos(latitude), fitted into a width × height box with padding. */
export function projectFeatures(features: GeoFeature[], width: number, height: number, pad = 8) {
  const rings: number[][][] = [];
  for (const f of features) {
    const polys = (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates) as number[][][][];
    for (const p of polys) rings.push(...p);
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of rings) for (const [x, y] of r) {
    if (x! < minX) minX = x!;
    if (x! > maxX) maxX = x!;
    if (y! < minY) minY = y!;
    if (y! > maxY) maxY = y!;
  }
  if (!isFinite(minX)) return { paths: [] as { key: string; d: string }[], viewBox: `0 0 ${width} ${height}` };
  const k = Math.cos((((minY + maxY) / 2) * Math.PI) / 180);
  const w = (maxX - minX) * k;
  const h = maxY - minY;
  const s = Math.min((width - pad * 2) / w, (height - pad * 2) / h);
  const ox = (width - w * s) / 2;
  const oy = (height - h * s) / 2;
  const px = (x: number) => ox + (x - minX) * k * s;
  const py = (y: number) => oy + (maxY - y) * s;
  /** Drops points closer than ~0.6 px to the previous kept one: invisible at map scale, and it cuts the path size by more than half. */
  const ringPath = (ring: number[][]) => {
    const pts: [number, number][] = [];
    for (const [x, y] of ring) {
      const X = px(x!);
      const Y = py(y!);
      const last = pts[pts.length - 1];
      if (!last || Math.abs(X - last[0]) + Math.abs(Y - last[1]) >= 0.6) pts.push([X, Y]);
    }
    // A zone smaller than a pixel at this scale stays visible and clickable as a tiny square.
    if (pts.length < 3) {
      const [X, Y] = pts[0] ?? [0, 0];
      return pts.length ? `M${(X - 0.8).toFixed(1)} ${(Y - 0.8).toFixed(1)}h1.6v1.6h-1.6Z` : "";
    }
    return "M" + pts.map(([X, Y]) => `${X.toFixed(1)} ${Y.toFixed(1)}`).join("L") + "Z";
  };
  const paths = features.map((f) => {
    const polys = (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates) as number[][][][];
    const d = polys.map((poly) => poly.map(ringPath).join("")).join("");
    return { key: f.key, d };
  });
  return { paths, viewBox: `0 0 ${width} ${height}` };
}

/** Quantile class breaks (n bins). Values equal across bins collapse to fewer classes. */
export function quantileBreaks(values: number[], bins = 5): number[] {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return [];
  const out: number[] = [];
  for (let i = 1; i < bins; i++) {
    const q = v[Math.min(v.length - 1, Math.floor((i / bins) * v.length))]!;
    if (!out.length || q > out[out.length - 1]!) out.push(q);
  }
  return out;
}

export const binOf = (value: number | null, breaks: number[]): number | null => {
  if (value == null) return null;
  let b = 0;
  for (const t of breaks) if (value >= t) b++;
  return b;
};

/** Sequential palette stops (light → dark in light theme, dark → light in dark theme via CSS variables). */
export const CHORO_VARS = ["var(--choro-1)", "var(--choro-2)", "var(--choro-3)", "var(--choro-4)", "var(--choro-5)"];
