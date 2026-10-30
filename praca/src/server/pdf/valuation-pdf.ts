import PDFDocument from "pdfkit";
import { formatEur, formatPercent } from "@/lib/format";
import type { ValuationRecord } from "@/server/valuation-data";

const TYPE_PT: Record<string, string> = { apartment: "Apartamento", house: "Moradia", shop: "Loja", office: "Escritório", warehouse: "Armazém", garage: "Garagem", building: "Prédio" };
const COND_PT: Record<string, string> = { new: "Novo", used: "Usado", to_renovate: "Para recuperar", under_construction: "Em construção" };
const KIND_PT: Record<string, string> = { active: "À venda", sold: "Vendido", rented: "Arrendado" };

/** Fetches an agency logo defensively: http(s) only, PNG/JPEG only, ≤ 400 KB, 3 s timeout. */
async function fetchLogo(url: string | null | undefined): Promise<Buffer | null> {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000), redirect: "follow" });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !/image\/(png|jpe?g)/i.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length <= 400_000 ? buf : null;
  } catch {
    return null;
  }
}

const hex = (c: string | null | undefined, fallback: string) => (c && /^#[0-9a-f]{6}$/i.test(c) ? c : fallback);

/** A4 branded valuation report: agency logo and colour, agent contacts, estimate, comparables, method. */
export async function renderValuationPdf(rec: ValuationRecord): Promise<Buffer> {
  const o = rec.outcome;
  const s = o.sale;
  if (!s) throw new Error("valuation without result");
  const brand = hex(rec.brand?.color, "#1d3fb5");
  const logo = await fetchLogo(rec.brand?.logoUrl);

  const doc = new PDFDocument({ size: "A4", margin: 48, info: { Title: "Relatório de avaliação", Author: rec.brand?.name ?? rec.agent?.name ?? "Praça", Producer: "Praça" } });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
  const W = doc.page.width - 96;

  // header band
  doc.rect(0, 0, doc.page.width, 92).fill(brand);
  let x = 48;
  if (logo) {
    try {
      doc.image(logo, x, 22, { fit: [120, 48] });
      x += 136;
    } catch {
      /* unreadable image: skip the logo */
    }
  }
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(20).text("Relatório de avaliação", x, 28, { width: W - (x - 48) });
  doc.font("Helvetica").fontSize(10).text(rec.brand?.name ?? rec.agent?.name ?? "Praça", x, 54, { width: W - (x - 48) });
  doc.fontSize(9).text(`Calculado em ${new Date(o.computedAt).toLocaleDateString("pt-PT")}`, x, 68, { width: W - (x - 48) });

  doc.fillColor("#1a1917");
  let y = 116;

  doc.font("Helvetica-Bold").fontSize(11).text("Imóvel avaliado", 48, y);
  y += 18;
  const i = o.input;
  const rows: [string, string][] = [
    ["Tipo", TYPE_PT[i.type] ?? i.type],
    ...(i.typology != null && (i.type === "apartment" || i.type === "house") ? ([["Tipologia", `T${i.typology}`]] as [string, string][]) : []),
    ["Área útil", `${i.area} m²`],
    ...(i.yearBuilt ? ([["Ano de construção", String(i.yearBuilt)]] as [string, string][]) : []),
    ...(i.condition ? ([["Estado", COND_PT[i.condition] ?? i.condition]] as [string, string][]) : []),
    ...(i.floor != null ? ([["Andar", i.floor === 0 ? "R/C" : `${i.floor}.º`]] as [string, string][]) : []),
    ...(i.address ? ([["Morada", i.address]] as [string, string][]) : []),
  ];
  doc.font("Helvetica").fontSize(10);
  for (const [k, v] of rows) {
    doc.fillColor("#625e57").text(k, 48, y, { width: 150 }).fillColor("#1a1917").text(v, 200, y, { width: W - 152 });
    y += 16;
  }

  // estimate card
  y += 12;
  doc.roundedRect(48, y, W, 110, 10).lineWidth(1).strokeColor("#dfdcd5").stroke();
  doc.fillColor("#625e57").font("Helvetica").fontSize(10).text("Valor estimado", 64, y + 14);
  doc.fillColor(brand).font("Helvetica-Bold").fontSize(30).text(formatEur(s.value).replace(/ /g, " "), 64, y + 30);
  doc.fillColor("#1a1917").font("Helvetica").fontSize(11).text(`Intervalo provável: ${formatEur(s.low).replace(/ /g, " ")} a ${formatEur(s.high).replace(/ /g, " ")}`, 64, y + 70);
  const lvl = { low: "baixa", medium: "média", high: "alta" }[s.level];
  doc.fillColor("#625e57").fontSize(9).text(`${formatEur(s.pricePerM2).replace(/ /g, " ")}/m² · confiança ${lvl} · ${s.n} comparáveis num raio de ${o.radiusM >= 1000 ? o.radiusM / 1000 + " km" : o.radiusM + " m"}`, 64, y + 88);
  if (o.rent) {
    const rx = 48 + W * 0.62;
    doc.fillColor("#625e57").fontSize(10).text("Renda estimada", rx, y + 14);
    doc.fillColor("#1a1917").font("Helvetica-Bold").fontSize(18).text(`${formatEur(o.rent.value).replace(/ /g, " ")}/mês`, rx, y + 32);
    if (o.grossYield != null) doc.font("Helvetica").fontSize(9).fillColor("#625e57").text(`Rendimento bruto: ${formatPercent(o.grossYield).replace(/ /g, " ")}`, rx, y + 58);
  }
  y += 128;

  // comparables
  doc.fillColor("#1a1917").font("Helvetica-Bold").fontSize(11).text("Comparáveis (ajustados ao seu imóvel)", 48, y);
  y += 18;
  const cols = [
    { h: "Imóvel", w: 190, a: "left" as const },
    { h: "Tipo", w: 56, a: "left" as const },
    { h: "Dist.", w: 44, a: "right" as const },
    { h: "Preço", w: 70, a: "right" as const },
    { h: "€/m² aj.", w: 60, a: "right" as const },
    { h: "Sem.", w: 40, a: "right" as const },
  ];
  const drawRow = (vals: string[], bold = false) => {
    let cx = 48;
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(8.5).fillColor(bold ? "#625e57" : "#1a1917");
    cols.forEach((c, k) => {
      doc.text(vals[k]!, cx, y, { width: c.w - 6, align: c.a, lineBreak: false, ellipsis: true });
      cx += c.w;
    });
    y += 15;
    doc.moveTo(48, y - 3).lineTo(48 + W, y - 3).lineWidth(0.5).strokeColor("#dfdcd5").stroke();
  };
  drawRow(cols.map((c) => c.h), true);
  for (const c of s.comparables.slice(0, 10)) {
    drawRow([c.title, KIND_PT[c.kind] ?? c.kind, c.distanceM >= 1000 ? `${(c.distanceM / 1000).toFixed(1)} km` : `${c.distanceM} m`, formatEur(c.price).replace(/ /g, " "), String(Math.round(c.adjustedPpm)), `${Math.round(c.similarity * 100)}%`]);
  }
  y += 10;

  // method
  if (y > 640) {
    doc.addPage();
    y = 56;
  }
  doc.fillColor("#1a1917").font("Helvetica-Bold").fontSize(11).text("Como foi calculado", 48, y);
  y += 16;
  doc.font("Helvetica").fontSize(9).fillColor("#625e57").text(
    "Seleção de comparáveis por distância, tipologia, área, idade, estado e recência; €/m² ajustado às características do imóvel avaliado (estado, andar, dimensão); mediana ponderada pela semelhança; intervalo entre os quantis 25 e 75 (nunca inferior a ±4 %). Os valores são de anúncio (preço pedido e último anúncio de imóveis vendidos), não preços de escritura.",
    48, y, { width: W, lineGap: 2 },
  );
  y = doc.y + 14;

  // agent footer
  doc.moveTo(48, y).lineTo(48 + W, y).lineWidth(1).strokeColor(brand).stroke();
  y += 10;
  const lines: string[] = [];
  const agentName = rec.agent?.name;
  if (agentName) lines.push(agentName + (rec.agent?.amiNumber ? ` · Licença AMI ${rec.agent.amiNumber}${rec.agent.amiStatus === "verified" ? " (verificada)" : ""}` : ""));
  if (rec.brand?.name) lines.push(rec.brand.name);
  const contact = [rec.brand?.email ?? rec.agent?.email, rec.brand?.phone, rec.brand?.website].filter(Boolean).join(" · ");
  if (contact) lines.push(contact);
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#1a1917").text("Mediador", 48, y);
  doc.font("Helvetica").fontSize(9).fillColor("#625e57").text(lines.join("\n"), 48, y + 12, { width: W });
  doc.fontSize(7.5).fillColor("#625e57").text("Estimativa indicativa baseada em anúncios. Não substitui uma avaliação bancária ou pericial. Gerado pela Praça.", 48, doc.page.height - 56, { width: W });

  doc.end();
  return done;
}
