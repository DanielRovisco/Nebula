import { XMLParser } from "fast-xml-parser";
import type { ParseResult, RawRecord, SourceAdapter } from "../types";

const parser = new XMLParser({ ignoreAttributes: true, trimValues: true, parseTagValue: false, isArray: (name) => ["property", "image", "feature"].includes(name) });

/** Reads the localised <desc> block, preferring Portuguese, then English. */
function description(desc: unknown): string | undefined {
  if (typeof desc === "string") return desc;
  if (desc && typeof desc === "object") {
    const d = desc as Record<string, unknown>;
    const v = d.pt ?? d.en ?? Object.values(d)[0];
    return typeof v === "string" ? v : undefined;
  }
  return undefined;
}

const text = (v: unknown) => (typeof v === "string" ? v : v == null ? undefined : String(v));

/**
 * Kyero v3 XML feed (also used by Thinkspain and many agency CRMs):
 * <root><property><id/><date/><ref/><price/><currency/><price_freq/><type/><town/><province/><location><latitude/><longitude/></location>
 * <beds/><baths/><pool/><surface_area><built/><plot/></surface_area><energy_rating><consumption/></energy_rating><url><pt/></url><desc><pt/></desc>
 * <features><feature/></features><images><image><url/></image></images></property></root>
 */
export const kyeroAdapter: SourceAdapter = {
  id: "kyero",
  name: "Feed XML Kyero / Thinkspain",
  formats: ["xml"],
  parse(input: string): ParseResult {
    let doc: Record<string, unknown>;
    try {
      doc = parser.parse(input.replace(/^﻿/, "")) as Record<string, unknown>;
    } catch (e) {
      return { records: [], warnings: [`XML inválido: ${(e as Error).message}`] };
    }
    const root = (doc.root ?? doc.kyero ?? doc) as Record<string, unknown>;
    const props = (root.property ?? []) as Record<string, unknown>[];
    if (!Array.isArray(props) || props.length === 0) return { records: [], warnings: ["O feed não contém elementos <property>."] };

    const records: RawRecord[] = props.map((p) => {
      const loc = (p.location ?? {}) as Record<string, unknown>;
      const area = (p.surface_area ?? {}) as Record<string, unknown>;
      const energy = (p.energy_rating ?? {}) as Record<string, unknown>;
      const feats = ((p.features as { feature?: unknown[] } | undefined)?.feature ?? []).map((f) => String(f).toLowerCase());
      const url = (p.url as Record<string, unknown> | string | undefined);
      const imgs = ((p.images as { image?: { url?: unknown }[] } | undefined)?.image ?? []).map((i) => text(i?.url)).filter(Boolean) as string[];
      const has = (re: RegExp) => feats.some((f) => re.test(f)) || undefined;
      return {
        id: text(p.ref) ?? text(p.id),
        date: text(p.date),
        price: text(p.price),
        // price_freq "sale" | "month" | "week"
        price_freq: text(p.price_freq) === "month" || text(p.price_freq) === "week" ? "rent" : "sale",
        type: text(p.type),
        town: text(p.town),
        province: text(p.province),
        latitude: text(loc.latitude),
        longitude: text(loc.longitude),
        beds: text(p.beds),
        baths: text(p.baths),
        surface_area: text(area.built),
        plot: text(area.plot),
        energy_rating: text(energy.consumption) ?? text(p.energy_rating),
        title: text(p.title) ?? undefined,
        desc: description(p.desc),
        url: typeof url === "string" ? url : text(url?.pt ?? url?.en),
        images: imgs,
        pool: text(p.pool) === "1" || has(/piscina|pool/),
        elevator: has(/elevador|lift|elevator/),
        terrace: has(/terra[cç]o|terrace/),
        balcony: has(/varanda|balcony/),
        garden: has(/jardim|garden/),
        parking: has(/garagem|garage|parking|estacionamento/),
      } satisfies RawRecord;
    });
    return { records, warnings: [] };
  },
};
