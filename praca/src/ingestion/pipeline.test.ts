import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { csvAdapter, kyeroAdapter } from "./adapters";

const hasDb = await (async () => {
  if (!process.env.DATABASE_URL) return false;
  try {
    const postgres = (await import("postgres")).default;
    const c = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 3 });
    await c`select nextval('property_reference_seq')`;
    await c.end();
    return true;
  } catch {
    return false;
  }
})();

const ex = (f: string) => readFileSync(join(process.cwd(), "examples/ingestion", f), "utf8");

// Integration: needs the migrated + seeded database.
describe.skipIf(!hasDb)("ingestion pipeline (database)", () => {
  const sources: string[] = [];
  afterAll(async () => {
    const { sql } = await import("@/db");
    for (const id of sources) {
      await sql`DELETE FROM properties WHERE id IN (SELECT property_id FROM listings WHERE source_id = ${id})`;
      await sql`DELETE FROM sources WHERE id = ${id}`;
    }
    await sql.end();
  });

  async function mkSource(slug: string, kind = "csv") {
    const { sql } = await import("@/db");
    const [s] = await sql<{ id: string }[]>`INSERT INTO sources (slug, name, kind, licence, enabled) VALUES (${`${slug}-${Date.now()}`}, ${slug}, ${kind}::source_kind, 'Teste: dados sintéticos de exemplo', true) RETURNING id`;
    sources.push(s!.id);
    return s!.id;
  }

  it("imports, updates prices with events, merges duplicates across sources and withdraws vanished adverts", async () => {
    const { sql } = await import("@/db");
    const { runIngestion } = await import("./pipeline");
    const a = await mkSource("agency-a");

    // 1) first import: 4 valid rows created, 1 rejected with a reason
    const r1 = await runIngestion({ sourceId: a, adapter: csvAdapter, content: ex("agency.csv"), mode: "full" });
    expect(r1.stats).toMatchObject({ received: 5, created: 4, rejected: 1 });
    expect(r1.status).toBe("partial");
    expect(r1.errors[0]!.stage).toBe("validate");
    const created = await sql<{ external_id: string; reference: string; is_primary: boolean; municipality_code: string | null }[]>`
      SELECT l.external_id, p.reference, l.is_primary, p.municipality_code FROM listings l JOIN properties p ON p.id = l.property_id WHERE l.source_id = ${a} ORDER BY l.external_id`;
    expect(created.length).toBe(4);
    expect(created.every((c) => c.is_primary && /^PR-\d{6}$/.test(c.reference) && c.municipality_code)).toBe(true);
    // ACME-004 had no coordinates: located through the municipality name ("Sintra" = 1111)
    expect(created.find((c) => c.external_id === "ACME-004")!.municipality_code).toBe("1111");
    const events = await sql`SELECT e.id FROM listing_events e JOIN listings l ON l.id = e.listing_id WHERE l.source_id = ${a} AND e.type = 'published' AND e.processed_at IS NULL`;
    expect(events.length).toBe(4); // picked up by the alert engine

    // 2) re-import unchanged: nothing created
    const r2 = await runIngestion({ sourceId: a, adapter: csvAdapter, content: ex("agency.csv"), mode: "full" });
    expect(r2.stats).toMatchObject({ created: 0, updated: 4, merged: 0 });

    // 3) price drop on ACME-001 → history + price_drop event + drop %
    const dropped = ex("agency.csv").replace('"285.000"', '"270.000"');
    const r3 = await runIngestion({ sourceId: a, adapter: csvAdapter, content: dropped });
    expect(r3.stats.updated).toBe(4);
    const [l1] = await sql<{ price: number; drop: number; id: string }[]>`SELECT id, price::float8 AS price, price_drop_pct::float8 AS drop FROM listings WHERE source_id = ${a} AND external_id = 'ACME-001'`;
    expect(l1!.price).toBe(270000);
    expect(l1!.drop).toBeGreaterThan(5);
    const [{ n } = { n: 0 }] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM listing_events WHERE listing_id = ${l1!.id} AND type = 'price_drop'`;
    expect(n).toBe(1);

    // 4) the same flat arrives from another agency, slightly different coordinates → merged into one property
    const b = await mkSource("agency-b");
    const dup = ex("agency.csv").split("\n").slice(0, 2).join("\n").replace("ACME-001", "B-777").replace("38.7107", "38.71072").replace('"285.000"', '"279.000"');
    const r4 = await runIngestion({ sourceId: b, adapter: csvAdapter, content: dup });
    expect(r4.stats.merged).toBe(1);
    const [m] = await sql<{ props: number; primaries: number }[]>`
      SELECT count(DISTINCT l.property_id)::int AS props, count(*) FILTER (WHERE l.is_primary)::int AS primaries FROM listings l WHERE l.source_id IN (${a}, ${b}) AND l.external_id IN ('ACME-001', 'B-777')`;
    expect(m).toEqual({ props: 1, primaries: 1 });

    // 5) full feed without ACME-002..004 → they are withdrawn
    const only1 = ex("agency.csv").split("\n").slice(0, 2).join("\n");
    const r5 = await runIngestion({ sourceId: a, adapter: csvAdapter, content: only1, mode: "full" });
    expect(r5.stats.withdrawn).toBe(3);
    const w = await sql`SELECT 1 FROM listings WHERE source_id = ${a} AND status = 'withdrawn'`;
    expect(w.length).toBe(3);
  });

  it("imports a Kyero XML feed with images and refuses sources without a licence", async () => {
    const { sql } = await import("@/db");
    const { runIngestion } = await import("./pipeline");
    const k = await mkSource("kyero", "xml_feed");
    const r = await runIngestion({ sourceId: k, adapter: kyeroAdapter, content: ex("feed-kyero.xml") });
    expect(r.stats).toMatchObject({ received: 2, created: 2, rejected: 0 });
    const media = await sql`SELECT m.url FROM listing_media m JOIN listings l ON l.id = m.listing_id WHERE l.source_id = ${k}`;
    expect(media.length).toBe(3);

    const [bad] = await sql<{ id: string }[]>`INSERT INTO sources (slug, name, kind, licence) VALUES (${`nolic-${Date.now()}`}, 'sem licença', 'csv', '') RETURNING id`;
    sources.push(bad!.id);
    await expect(runIngestion({ sourceId: bad!.id, adapter: kyeroAdapter, content: "<root/>" })).rejects.toThrow(/licença/);
  });
});
