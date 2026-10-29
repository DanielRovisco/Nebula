import { ImageResponse } from "next/og";
import { formatEur } from "@/lib/format";
import { getPropertyByReference } from "@/server/properties";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

export default async function OgImage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const p = await getPropertyByReference(ref).catch(() => null);
  const title = p?.primary.title ?? "Praça";
  const price = p ? formatEur(p.primary.price) + (p.primary.business === "rent" ? "/mês" : "") : "";
  const place = p ? [p.geo.parish?.name, p.geo.municipality?.name].filter(Boolean).join(", ") : "";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#f5f4f1", padding: 64, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 40, fontWeight: 700, color: "#1a1917" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "#1d3fb5", display: "flex" }} />
          Praça
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1, color: "#1a1917" }}>{title}</div>
          <div style={{ fontSize: 34, color: "#625e57" }}>{place}</div>
        </div>
        <div style={{ fontSize: 72, fontWeight: 700, color: "#1d3fb5" }}>{price}</div>
      </div>
    ),
    size,
  );
}
