import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { triggerFor } from "./alerts";

describe("triggerFor", () => {
  it("maps listing events to alert triggers", () => {
    expect(triggerFor("published")).toBe("new_listing");
    expect(triggerFor("price_drop")).toBe("price_drop");
    expect(triggerFor("returned")).toBe("back_on_market");
    expect(triggerFor("sold")).toBe("sold_or_withdrawn");
    expect(triggerFor("withdrawn")).toBe("sold_or_withdrawn");
    expect(triggerFor("merged")).toBeNull();
    expect(triggerFor("price_rise")).toBeNull();
  });
});

const hasDb = await (async () => {
  if (!process.env.DATABASE_URL) return false;
  try {
    const postgres = (await import("postgres")).default;
    const c = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 3 });
    await c`select 1`;
    await c.end();
    return true;
  } catch {
    return false;
  }
})();

// Integration: needs a migrated + seeded database (pnpm db:migrate && pnpm db:seed). Skipped otherwise.
describe.skipIf(!hasDb)("alert engine (database)", () => {
  let sql: typeof import("@/db").sql;
  let engine: typeof import("./alerts");
  const ids: { user?: string; property?: string } = {};

  beforeAll(async () => {
    ({ sql } = await import("@/db"));
    engine = await import("./alerts");
  });
  afterAll(async () => {
    if (ids.property) await sql`DELETE FROM properties WHERE id = ${ids.property}`;
    if (ids.user) await sql`DELETE FROM users WHERE id = ${ids.user}`;
    await sql.end();
  });

  it("queues each matching event once, then sends a digest, and ignores non-matching searches", async () => {
    const [u] = await sql<{ id: string }[]>`INSERT INTO users (email, name, onboarded_at) VALUES (${`alert-test+${Date.now()}@example.com`}, 'Alert Test', now()) RETURNING id`;
    ids.user = u!.id;
    const mk = async (name: string, qs: string) => {
      const [s] = await sql<{ id: string }[]>`INSERT INTO saved_searches (user_id, name, filters) VALUES (${u!.id}, ${name}, ${sql.json({ business: "sale", qs, geoSlugs: {} })}) RETURNING id`;
      await sql`INSERT INTO alerts (saved_search_id, user_id, frequency, triggers, unsubscribe_token) VALUES (${s!.id}, ${u!.id}, 'instant', ARRAY['new_listing','price_drop']::alert_trigger[], ${`tok${Math.random().toString(36).slice(2)}${Date.now()}`})`;
    };
    await mk("Lisboa T2 até 900k", "m=1106&t=2&pmax=900000");
    await mk("Porto (não deve corresponder)", "m=1312");

    const [src] = await sql<{ id: string }[]>`SELECT id FROM sources WHERE slug = 'seed-feed-a'`;
    const [p] = await sql<{ id: string }[]>`
      INSERT INTO properties (reference, fingerprint, type, typology, usable_area, district_code, municipality_code, parish_code, lat, lng, is_seed)
      VALUES (${`PR-T${Date.now() % 100000}`}, 'test', 'apartment', 2, 80, '11', '1106', (SELECT code FROM geo_parishes WHERE municipality_code = '1106' LIMIT 1), 38.7369, -9.1427, true) RETURNING id`;
    ids.property = p!.id;
    const [l] = await sql<{ id: string }[]>`
      INSERT INTO listings (property_id, source_id, external_id, business, price, initial_price, price_per_m2, advertiser_type, title, published_at, is_seed)
      VALUES (${p!.id}, ${src!.id}, ${`alert-test-${Date.now()}`}, 'sale', 450000, 450000, 5625, 'professional', 'Apartamento T2 de teste', now(), true) RETURNING id`;
    await sql`INSERT INTO listing_events (listing_id, property_id, type, to_price) VALUES (${l!.id}, ${p!.id}, 'published', 450000)`;

    const r1 = await engine.runAlertEngine();
    expect(r1.queued).toBe(1);
    const queued = await sql`SELECT d.id FROM alert_deliveries d JOIN alerts a ON a.id = d.alert_id WHERE a.user_id = ${u!.id}`;
    expect(queued.length).toBe(1);

    const r2 = await engine.runAlertEngine(); // idempotent
    expect(r2.queued).toBe(0);

    const digests = await engine.sendDigests("instant");
    expect(digests.emails).toBeGreaterThanOrEqual(1);
    const sent = await sql`SELECT status FROM alert_deliveries d JOIN alerts a ON a.id = d.alert_id WHERE a.user_id = ${u!.id}`;
    expect(sent.every((x) => x.status === "sent")).toBe(true);
  });
});
