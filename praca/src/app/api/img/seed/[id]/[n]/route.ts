import { NextResponse, type NextRequest } from "next/server";
import { Rng, hashString } from "@/lib/rng";

// Illustrative placeholder images for demo data. Deterministic per (property, index); never passed off as photos.
const PALETTES = [
  { sky: "#cfe0ee", wall: "#e9dcc8", wall2: "#d8c3a3", roof: "#a65a3d", glass: "#7fa3bd", ground: "#b9c7a5" },
  { sky: "#e5d9c8", wall: "#f3efe6", wall2: "#d9d2c2", roof: "#7c8aa8", glass: "#92aac4", ground: "#c4cba9" },
  { sky: "#d6e4e0", wall: "#efe5d3", wall2: "#d6c6a8", roof: "#9a4e3a", glass: "#86a7b1", ground: "#aec3a0" },
  { sky: "#dfe3f0", wall: "#e8e3da", wall2: "#cfc7b8", roof: "#5e6a8c", glass: "#8aa0c4", ground: "#bcc8ad" },
  { sky: "#eadccd", wall: "#f1e9dc", wall2: "#dccbb0", roof: "#b3654a", glass: "#8fb0c2", ground: "#c1c9a6" },
];

const esc = (s: string) => s.replace(/[<>&"]/g, "");

function exterior(r: Rng, p: (typeof PALETTES)[number], kind: number) {
  const parts: string[] = [];
  parts.push(`<rect width="1200" height="800" fill="${p.sky}"/>`);
  parts.push(`<circle cx="${r.int(120, 1000)}" cy="${r.int(90, 170)}" r="${r.int(36, 56)}" fill="#fff" opacity=".7"/>`);
  parts.push(`<rect y="640" width="1200" height="160" fill="${p.ground}"/>`);
  if (kind === 0) {
    // apartment block
    const floors = r.int(4, 7);
    const cols = r.int(4, 6);
    const w = cols * 110 + 80;
    const x0 = (1200 - w) / 2;
    const h = floors * 90 + 40;
    parts.push(`<rect x="${x0}" y="${640 - h}" width="${w}" height="${h}" fill="${p.wall}"/>`);
    parts.push(`<rect x="${x0 - 10}" y="${640 - h - 16}" width="${w + 20}" height="18" fill="${p.wall2}"/>`);
    for (let f = 0; f < floors; f++)
      for (let c = 0; c < cols; c++) {
        const x = x0 + 40 + c * 110;
        const y = 640 - h + 30 + f * 90;
        parts.push(`<rect x="${x}" y="${y}" width="60" height="56" rx="4" fill="${p.glass}"/>`);
        if (r.chance(0.35)) parts.push(`<rect x="${x - 8}" y="${y + 46}" width="76" height="8" fill="${p.wall2}"/>`);
      }
    parts.push(`<rect x="${x0 + w / 2 - 28}" y="590" width="56" height="50" fill="${p.wall2}"/>`);
  } else if (kind === 1) {
    // house with pitched roof
    const w = r.int(380, 520);
    const x0 = (1200 - w) / 2;
    parts.push(`<rect x="${x0}" y="430" width="${w}" height="210" fill="${p.wall}"/>`);
    parts.push(`<polygon points="${x0 - 30},430 ${600},290 ${x0 + w + 30},430" fill="${p.roof}"/>`);
    parts.push(`<rect x="${x0 + 50}" y="480" width="80" height="70" rx="4" fill="${p.glass}"/>`);
    parts.push(`<rect x="${x0 + w - 130}" y="480" width="80" height="70" rx="4" fill="${p.glass}"/>`);
    parts.push(`<rect x="${600 - 30}" y="520" width="60" height="120" rx="4" fill="${p.wall2}"/>`);
    parts.push(`<circle cx="${x0 - 70}" cy="590" r="46" fill="#7fa070"/><rect x="${x0 - 76}" y="600" width="12" height="46" fill="#7a6a58"/>`);
  } else if (kind === 2) {
    // land
    parts.push(`<rect y="460" width="1200" height="340" fill="${p.ground}"/>`);
    parts.push(`<path d="M0 520 Q300 470 600 520 T1200 500 V800 H0Z" fill="#a9ba96"/>`);
    parts.push(`<path d="M0 600 Q400 560 800 610 T1200 590 V800 H0Z" fill="#98ab85"/>`);
    parts.push(`<path d="M520 800 L600 560 L680 800Z" fill="#cdbf9c" opacity=".8"/>`);
  } else {
    // shopfront
    parts.push(`<rect x="220" y="260" width="760" height="380" fill="${p.wall}"/>`);
    parts.push(`<rect x="220" y="260" width="760" height="70" fill="${p.roof}"/>`);
    parts.push(`<rect x="260" y="380" width="420" height="220" rx="6" fill="${p.glass}"/>`);
    parts.push(`<rect x="730" y="380" width="200" height="260" rx="6" fill="${p.wall2}"/>`);
    for (let i = 0; i < 8; i++) parts.push(`<rect x="${220 + i * 95}" y="330" width="48" height="42" fill="${i % 2 ? "#fff" : p.wall2}" opacity=".9"/>`);
  }
  return parts.join("");
}

function interior(r: Rng, p: (typeof PALETTES)[number]) {
  const parts: string[] = [];
  parts.push(`<rect width="1200" height="800" fill="${p.wall}"/>`);
  parts.push(`<rect y="560" width="1200" height="240" fill="${p.wall2}"/>`);
  const wx = r.int(120, 420);
  parts.push(`<rect x="${wx}" y="110" width="360" height="300" rx="8" fill="${p.sky}" stroke="#fff" stroke-width="14"/>`);
  parts.push(`<line x1="${wx + 180}" y1="110" x2="${wx + 180}" y2="410" stroke="#fff" stroke-width="10"/>`);
  parts.push(`<rect x="${wx + 520}" y="150" width="200" height="${r.int(240, 300)}" rx="6" fill="${p.glass}" opacity=".55"/>`);
  parts.push(`<rect x="${r.int(160, 520)}" y="470" width="${r.int(300, 420)}" height="110" rx="14" fill="${p.roof}" opacity=".85"/>`);
  parts.push(`<rect x="${r.int(700, 880)}" y="500" width="150" height="80" rx="8" fill="#fff" opacity=".6"/>`);
  return parts.join("");
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; n: string }> }) {
  const { id, n } = await params;
  const idx = Math.max(0, Math.min(40, Number.parseInt(n, 10) || 0));
  const seed = hashString(id);
  const r = new Rng(seed ^ (idx * 2654435761));
  const p = PALETTES[seed % PALETTES.length]!;
  const k = Number.parseInt(req.nextUrl.searchParams.get("k") ?? "", 10);
  const kind = k >= 0 && k <= 3 ? k : seed % 4;
  const body = idx === 0 || idx % 4 === 1 ? exterior(new Rng(seed), p, kind) : idx % 4 === 2 ? interior(r, p) : exterior(r, PALETTES[(seed + idx) % PALETTES.length]!, kind);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" role="img" aria-label="${esc("Imagem ilustrativa")}">${body}<g opacity=".92"><rect x="24" y="740" width="292" height="38" rx="19" fill="#1a1917" opacity=".72"/><text x="170" y="765" font-family="Inter,Arial,sans-serif" font-size="19" fill="#fff" text-anchor="middle">Imagem ilustrativa · demo</text></g></svg>`;
  return new NextResponse(svg, {
    headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "public, max-age=31536000, immutable" },
  });
}
