#!/usr/bin/env node
// Downloads Portugal's administrative geography (CAOP/DGT, via the open geoapi.pt mirror)
// and writes simplified, committed JSON snapshots into data/geo/. Run once; the app never
// needs the network for geography afterwards. See docs/DATA_SOURCES.md.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "geo");
mkdirSync(root, { recursive: true });
const BASE = "https://json.geoapi.pt";

async function get(path, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(BASE + path, { signal: AbortSignal.timeout(60000) });
      if (res.ok) return await res.json();
      if (res.status === 404) return null;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 800 * (i + 1)));
  }
  throw new Error("failed " + path);
}

// Ramer–Douglas–Peucker on a ring of [lon, lat]
function simplifyRing(ring, tol) {
  if (ring.length <= 8) return ring;
  const keep = new Uint8Array(ring.length);
  keep[0] = keep[ring.length - 1] = 1;
  const stack = [[0, ring.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let max = 0;
    let idx = -1;
    const [ax, ay] = ring[a];
    const [bx, by] = ring[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = ring[i];
      let d;
      if (len === 0) d = Math.hypot(px - ax, py - ay);
      else {
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len));
        d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
      }
      if (d > max) {
        max = d;
        idx = i;
      }
    }
    if (max > tol && idx > 0) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  const out = ring.filter((_, i) => keep[i]);
  return out.length >= 4 ? out : ring.slice(0, 4);
}

function simplifyGeom(geom, tol) {
  const r = (n) => Math.round(n * 1e5) / 1e5;
  const ring = (rg) => simplifyRing(rg, tol).map(([x, y]) => [r(x), r(y)]);
  if (geom.type === "Polygon") return { type: "Polygon", coordinates: geom.coordinates.map(ring) };
  return {
    type: "MultiPolygon",
    coordinates: geom.coordinates.map((poly) => poly.map(ring)),
  };
}

const centroid = (p) => {
  const c = p.centros?.centroDeMassa ?? p.centros?.centroide ?? p.centros?.centro;
  return [Math.round(c[0] * 1e5) / 1e5, Math.round(c[1] * 1e5) / 1e5];
};

const islandRegion = (code) => (code.startsWith("3") ? "Madeira" : "Açores");

const districts = await get("/distritos");
const targets = [];
for (const d of districts) targets.push({ name: d.distrito, code: d.codigoine });

const municipalities = [];
const parishes = [];
const queue = [];
for (const d of targets) {
  const list = await get("/distrito/" + encodeURIComponent(d.name) + "/municipios");
  for (const m of list.municipios) queue.push({ ...m, district: d });
}
console.log("municipalities:", queue.length);

let done = 0;
async function worker() {
  while (queue.length) {
    const m = queue.shift();
    const data = await get("/municipio/" + encodeURIComponent(m.nome) + "/freguesias");
    if (!data) throw new Error("missing " + m.nome);
    const mf = data.geojsons.municipio;
    const code = m.codigoine;
    const isIsland = !/^(0[1-9]|1[0-8])/.test(code);
    municipalities.push({
      code,
      name: data.nome,
      districtCode: isIsland ? (code.startsWith("3") ? "31" : "40") : code.slice(0, 2),
      districtName: isIsland ? islandRegion(code) : m.district.name,
      centroid: centroid(mf.properties),
      areaHa: mf.properties.Area_T_ha,
      geometry: simplifyGeom(mf.geometry, 0.0007),
    });
    for (const f of data.geojsons.freguesias) {
      const p = f.properties;
      parishes.push({
        code: p.Dicofre,
        name: p.freguesia ?? p.nome,
        municipalityCode: code,
        centroid: centroid(p),
        areaHa: p.area_ha ?? p.Area_T_ha,
        geometry: simplifyGeom(f.geometry, 0.00035),
      });
    }
    done++;
    if (done % 25 === 0) console.log(done, "municipalities done");
  }
}
await Promise.all(Array.from({ length: 4 }, worker));

municipalities.sort((a, b) => a.code.localeCompare(b.code));
parishes.sort((a, b) => a.code.localeCompare(b.code));
const distMap = new Map();
for (const m of municipalities) distMap.set(m.districtCode, m.districtName);
const out = [...distMap].map(([code, name]) => ({ code, name })).sort((a, b) => a.code.localeCompare(b.code));
writeFileSync(join(root, "districts.json"), JSON.stringify(out));
writeFileSync(join(root, "municipalities.json"), JSON.stringify(municipalities));
writeFileSync(join(root, "parishes.json"), JSON.stringify(parishes));
console.log("districts", out.length, "municipalities", municipalities.length, "parishes", parishes.length);
