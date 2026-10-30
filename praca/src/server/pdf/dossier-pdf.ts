import PDFDocument from "pdfkit";
import type { FairPrice } from "@/lib/fair-price";
import { formatChange, formatEur } from "@/lib/format";
import type { PurchaseCosts } from "@/lib/calc-pt";
import type { RiskAt } from "@/server/risk";

const TYPE_PT: Record<string, string> = { apartment: "Apartamento", house: "Moradia", land: "Terreno", shop: "Loja", office: "Escritório", warehouse: "Armazém", garage: "Garagem", building: "Prédio" };
const COND_PT: Record<string, string> = { new: "Novo", used: "Usado", to_renovate: "Para recuperar", under_construction: "Em construção" };
const VERDICT_PT = { below: "Abaixo do preço de mercado", fair: "Preço dentro do mercado", above: "Acima do preço de mercado" } as const;

export interface DossierData {
  reference: string;
  title: string;
  business: "sale" | "rent";
  price: number;
  pricePerM2: number | null;
  type: string;
  typology: number | null;
  usableArea: number | null;
  grossArea: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  yearBuilt: number | null;
  condition: string | null;
  energyClass: string | null;
  floor: number | null;
  parking: number | null;
  place: string;
  isSeed: boolean;
  priceHistory: { at: string; price: number }[];
  fair: FairPrice | null;
  zone: { pricePerM2: number | null; n: number } | null;
  risks: RiskAt[];
  costs: { hpp: PurchaseCosts; secondary: PurchaseCosts; monthly: number; loan: number; ratePct: number; years: number; verified: boolean } | null;
  generatedAt: string;
  url: string;
}

const nb = (s: string) => s.replace(/ /g, " ");

/** A4 property dossier: identification, price and fair-price verdict, history, hazards, purchase costs, sources. */
export async function renderDossierPdf(d: DossierData): Promise<Buffer> {
  const brand = "#1d3fb5";
  const doc = new PDFDocument({ size: "A4", margin: 48, info: { Title: `Dossiê ${d.reference}`, Author: "Praça", Producer: "Praça" } });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
  const W = doc.page.width - 96;
  let y = 0;
  const ensure = (h: number) => {
    if (y + h > doc.page.height - 70) {
      doc.addPage();
      y = 56;
    }
  };
  const h2 = (t: string) => {
    ensure(40);
    doc.fillColor("#1a1917").font("Helvetica-Bold").fontSize(12).text(t, 48, y);
    y += 20;
  };
  const kv = (k: string, v: string) => {
    ensure(16);
    doc.font("Helvetica").fontSize(10).fillColor("#625e57").text(k, 48, y, { width: 170 }).fillColor("#1a1917").text(v, 220, y, { width: W - 172 });
    y += 16;
  };

  doc.rect(0, 0, doc.page.width, 92).fill(brand);
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(20).text("Dossiê do imóvel", 48, 28, { width: W });
  doc.font("Helvetica").fontSize(10).text(`${d.reference} · ${d.place}`, 48, 54, { width: W });
  doc.fontSize(9).text(`Gerado em ${new Date(d.generatedAt).toLocaleDateString("pt-PT")}`, 48, 68, { width: W });
  y = 114;
  if (d.isSeed) {
    doc.roundedRect(48, y, W, 26, 6).fill("#fff1d6");
    doc.fillColor("#8a5300").font("Helvetica-Bold").fontSize(9).text("Dados de demonstração. Este imóvel e os valores são sintéticos.", 58, y + 9, { width: W - 20 });
    y += 40;
  }

  doc.fillColor("#1a1917").font("Helvetica-Bold").fontSize(15).text(d.title, 48, y, { width: W });
  y = doc.y + 8;
  doc.fillColor(brand).font("Helvetica-Bold").fontSize(26).text(nb(formatEur(d.price)) + (d.business === "rent" ? "/mês" : ""), 48, y);
  y = doc.y + 4;
  if (d.pricePerM2) {
    doc.fillColor("#625e57").font("Helvetica").fontSize(10).text(`${nb(formatEur(d.pricePerM2))}/m²`, 48, y);
    y = doc.y + 4;
  }
  if (d.fair) {
    const pct = Math.round(Math.abs(d.fair.deviation) * 100);
    const line = d.fair.verdict === "fair" ? `Intervalo estimado ${nb(formatEur(d.fair.low))} a ${nb(formatEur(d.fair.high))}` : `${pct} % ${d.fair.deviation > 0 ? "acima" : "abaixo"} do valor estimado (${nb(formatEur(d.fair.value))})`;
    doc.fillColor("#1a1917").font("Helvetica-Bold").fontSize(11).text(VERDICT_PT[d.fair.verdict], 48, y + 6);
    doc.fillColor("#625e57").font("Helvetica").fontSize(9).text(`${line} · ${d.fair.n} comparáveis semelhantes`, 48, doc.y + 2, { width: W });
    y = doc.y + 8;
  }
  y += 10;

  h2("Características");
  const rows: [string, string | null][] = [
    ["Tipo", TYPE_PT[d.type] ?? d.type],
    ["Tipologia", d.typology != null && (d.type === "apartment" || d.type === "house") ? `T${d.typology}${d.typology === 5 ? "+" : ""}` : null],
    ["Área útil", d.usableArea ? `${d.usableArea} m²` : null],
    ["Área bruta", d.grossArea ? `${d.grossArea} m²` : null],
    ["Quartos / casas de banho", d.bedrooms != null || d.bathrooms != null ? `${d.bedrooms ?? "—"} / ${d.bathrooms ?? "—"}` : null],
    ["Ano de construção", d.yearBuilt ? String(d.yearBuilt) : null],
    ["Estado", d.condition ? (COND_PT[d.condition] ?? d.condition) : null],
    ["Certificado energético", d.energyClass],
    ["Andar", d.floor == null ? null : d.floor === 0 ? "R/C" : `${d.floor}.º`],
    ["Estacionamento", d.parking ? String(d.parking) : null],
  ];
  for (const [k, v] of rows) if (v) kv(k, v);
  y += 8;

  if (d.zone?.pricePerM2) {
    h2("Zona");
    kv("Mediana da zona", `${nb(formatEur(d.zone.pricePerM2))}/m² (${d.zone.n} anúncios)`);
    if (d.pricePerM2) kv("Este imóvel vs. zona", formatChange((d.pricePerM2 - d.zone.pricePerM2) / d.zone.pricePerM2));
    y += 8;
  }

  if (d.priceHistory.length > 1) {
    h2("Histórico de preço");
    for (const h of d.priceHistory.slice(-8)) kv(new Date(h.at).toLocaleDateString("pt-PT"), nb(formatEur(h.price)));
    y += 8;
  }

  if (d.risks.length) {
    h2("Riscos naturais");
    for (const r of d.risks) kv(r.name + (r.isSeed ? " (demonstração)" : ""), r.level ? (r.levelLabel ?? r.level) : "Fora das zonas mapeadas");
    doc.font("Helvetica").fontSize(8).fillColor("#625e57").text("«Fora das zonas mapeadas» significa que a camada não tem polígono neste ponto. Não garante ausência de risco.", 48, y, { width: W });
    y = doc.y + 10;
  }

  if (d.costs && d.business === "sale") {
    h2("Custos de compra (estimativa)");
    kv("IMT + selo, habitação própria", nb(formatEur(d.costs.hpp.total)));
    kv("IMT + selo, habitação secundária", nb(formatEur(d.costs.secondary.total)));
    kv(`Prestação (${d.costs.years} anos, ${d.costs.ratePct.toFixed(2).replace(".", ",")} %)`, `${nb(formatEur(d.costs.monthly))}/mês sobre ${nb(formatEur(d.costs.loan))}`);
    doc.font("Helvetica").fontSize(8).fillColor("#625e57").text(`Entrada de 20 %, taxa = Euribor + spread de 1 %.${d.costs.verified ? "" : " Tabelas fiscais por confirmar na fonte oficial."} Não inclui registos, escritura nem comissões.`, 48, y, { width: W });
    y = doc.y + 10;
  }

  ensure(60);
  doc.moveTo(48, y).lineTo(48 + W, y).lineWidth(1).strokeColor(brand).stroke();
  doc.font("Helvetica").fontSize(8).fillColor("#625e57").text(`Fonte: ${d.url}. Os valores são de anúncio (preço pedido), não de escritura. Estimativa indicativa que não substitui uma avaliação bancária ou pericial. Gerado pela Praça.`, 48, y + 8, { width: W });

  doc.end();
  return done;
}
