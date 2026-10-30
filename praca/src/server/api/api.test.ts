import { NextRequest } from "next/server";
import { afterAll, describe, expect, it } from "vitest";
import { buildOpenApi } from "@/lib/openapi";
import { generateKey, hashKey } from "./auth";

describe("API keys", () => {
  it("generates unguessable keys whose hash is what gets stored", () => {
    const a = generateKey();
    const b = generateKey();
    expect(a.secret).toMatch(/^prk_[A-Za-z0-9_-]{30,}$/);
    expect(a.secret).not.toBe(b.secret);
    expect(a.prefix).toBe(a.secret.slice(0, 12));
    expect(a.hash).toBe(hashKey(a.secret));
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("OpenAPI document", () => {
  const spec = buildOpenApi();
  it("is OpenAPI 3.1 with the six documented operations", () => {
    expect(spec.openapi).toBe("3.1.0");
    expect(Object.keys(spec.paths).sort()).toEqual(["/alerts", "/developments", "/market/{geoId}", "/properties", "/properties/{id}", "/valuations"]);
  });
  it("only references schemas that exist", () => {
    const refs = [...JSON.stringify(spec).matchAll(/#\/components\/schemas\/(\w+)/g)].map((m) => m[1]!);
    for (const r of new Set(refs)) expect(Object.keys(spec.components.schemas), r).toContain(r);
  });
  it("every operation has an id, a tag and error responses", () => {
    for (const [path, item] of Object.entries(spec.paths)) for (const [method, op] of Object.entries(item as unknown as Record<string, { operationId?: string; tags?: string[]; responses: Record<string, unknown> }>)) {
      expect(op.operationId, `${method} ${path}`).toBeTruthy();
      expect(op.tags?.length).toBeGreaterThan(0);
      expect(Object.keys(op.responses).some((c) => c.startsWith("4"))).toBe(true);
    }
  });
});

const hasDb = await (async () => {
  if (!process.env.DATABASE_URL) return false;
  try {
    const postgres = (await import("postgres")).default;
    const c = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 3 });
    const [r] = await c`select count(*)::int as n from listings where is_seed`;
    await c.end();
    return (r?.n ?? 0) > 100;
  } catch {
    return false;
  }
})();

const call = (url: string, key?: string, init: { method?: string; body?: unknown } = {}) =>
  new NextRequest(`http://localhost${url}`, { method: init.method ?? "GET", headers: { ...(key ? { authorization: `Bearer ${key}` } : {}), "content-type": "application/json" }, body: init.body ? JSON.stringify(init.body) : undefined });
const ctx = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });

// Contract tests against the real handlers and database (needs migrate + seed).
describe.skipIf(!hasDb)("API v1 contract (database)", () => {
  const ids: { users: string[]; orgs: string[] } = { users: [], orgs: [] };
  afterAll(async () => {
    const { sql } = await import("@/db");
    for (const o of ids.orgs) await sql`DELETE FROM organizations WHERE id = ${o}`;
    for (const u of ids.users) await sql`DELETE FROM users WHERE id = ${u}`;
    await sql.end();
  });

  async function user(plan: "free" | "agency", limitOverride?: number) {
    const { sql } = await import("@/db");
    const [u] = await sql<{ id: string }[]>`INSERT INTO users (email, name, onboarded_at) VALUES (${`api-${plan}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`}, 'API Test', now()) RETURNING id`;
    ids.users.push(u!.id);
    if (plan === "agency") {
      const [o] = await sql<{ id: string }[]>`INSERT INTO organizations (name, slug, plan) VALUES ('API Org', ${`api-org-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`}, 'agency') RETURNING id`;
      ids.orgs.push(o!.id);
      await sql`INSERT INTO memberships (organization_id, user_id, role) VALUES (${o!.id}, ${u!.id}, 'owner')`;
      await sql`INSERT INTO subscriptions (organization_id, plan, status, seats, stripe_subscription_id) VALUES (${o!.id}, 'agency', 'active', 5, ${`test_${Date.now()}_${Math.random()}`})`;
      if (limitOverride != null) await sql`INSERT INTO usage_counters (scope_type, scope_id, feature, period, count) VALUES ('org', ${o!.id}, 'api_calls', date_trunc('month', now())::date, ${limitOverride}) ON CONFLICT (scope_type, scope_id, feature, period) DO UPDATE SET count = ${limitOverride}`;
    }
    const k = generateKey();
    await sql`INSERT INTO api_keys (user_id, name, prefix, key_hash) VALUES (${u!.id}, 'test', ${k.prefix}, ${k.hash})`;
    return { userId: u!.id, key: k.secret };
  }

  it("rejects missing, malformed and unknown keys with the standard error body", async () => {
    const { GET } = await import("@/app/api/v1/properties/route");
    for (const key of [undefined, "nope", "prk_doesnotexist"]) {
      const res = await GET(call("/api/v1/properties", key));
      expect(res.status).toBe(401);
      expect(await res.json()).toMatchObject({ error: { code: "unauthorized", message: expect.any(String) } });
    }
  });

  it("requires a plan with API access", async () => {
    const { GET } = await import("@/app/api/v1/properties/route");
    const { key } = await user("free");
    const res = await GET(call("/api/v1/properties", key));
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("plan_required");
  });

  it("searches with filters, paginates by cursor and exposes quota headers", async () => {
    const { GET } = await import("@/app/api/v1/properties/route");
    const { key } = await user("agency");
    const res = await GET(call("/api/v1/properties?m=1106&tipo=apartment&t=2&ordem=price_asc&limit=5", key));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-quota-limit")).toBe("10000");
    const body = await res.json();
    expect(body.data.length).toBe(5);
    expect(body.meta.total).toBeGreaterThan(5);
    expect(body.meta.nextCursor).toBeTruthy();
    const item = body.data[0];
    expect(item).toMatchObject({ reference: expect.stringMatching(/^PR-\d{6}$/), business: "sale", type: "apartment", typology: 2, location: { lat: expect.any(Number) }, isDemo: true });
    const prices = body.data.map((d: { price: number }) => d.price);
    expect([...prices].sort((a: number, b: number) => a - b)).toEqual(prices);
    const next = await (await GET(call(`/api/v1/properties?m=1106&tipo=apartment&t=2&ordem=price_asc&limit=5&cursor=${body.meta.nextCursor}`, key))).json();
    expect(next.data[0].id).not.toBe(body.data[0].id);
    expect(next.data[0].price).toBeGreaterThanOrEqual(prices[4]);
  });

  it("validates parameters (400) and unknown resources (404)", async () => {
    const { GET } = await import("@/app/api/v1/properties/route");
    const { GET: GET_ONE } = await import("@/app/api/v1/properties/[id]/route");
    const { GET: GET_MARKET } = await import("@/app/api/v1/market/[geoId]/route");
    const { key } = await user("agency");
    const bad = await GET(call("/api/v1/properties?limit=500", key));
    expect(bad.status).toBe(400);
    expect((await bad.json()).error.code).toBe("invalid_parameter");
    expect((await GET_ONE(call("/api/v1/properties/PR-999999", key), ctx({ id: "PR-999999" }))).status).toBe(404);
    expect((await GET_ONE(call("/api/v1/properties/xyz", key), ctx({ id: "xyz" }))).status).toBe(404);
    expect((await GET_MARKET(call("/api/v1/market/9999", key), ctx({ geoId: "9999" }))).status).toBe(404);
  });

  it("returns a property, market indicators, a valuation and developments", async () => {
    const { GET: GET_ONE } = await import("@/app/api/v1/properties/[id]/route");
    const { GET: GET_MARKET } = await import("@/app/api/v1/market/[geoId]/route");
    const { POST: VAL } = await import("@/app/api/v1/valuations/route");
    const { GET: DEV } = await import("@/app/api/v1/developments/route");
    const { key } = await user("agency");

    const one = await (await GET_ONE(call("/api/v1/properties/PR-000871", key), ctx({ id: "PR-000871" }))).json();
    expect(one.data).toMatchObject({ reference: "PR-000871", listing: { business: expect.any(String) }, priceHistory: expect.any(Array) });

    const market = await (await GET_MARKET(call("/api/v1/market/1106?months=12", key), ctx({ geoId: "1106" }))).json();
    expect(market.data.geo).toMatchObject({ id: "1106", level: "municipality", name: "Lisboa" });
    expect(market.data.sale.medianPricePerM2).toBeGreaterThan(3000);
    expect(market.data.sale.sample).toBeGreaterThanOrEqual(10);
    expect(market.data.series.sale.length).toBeLessThanOrEqual(12);

    const val = await VAL(call("/api/v1/valuations", key, { method: "POST", body: { lat: 38.7369, lng: -9.1427, type: "apartment", typology: 2, area: 80 } }));
    expect(val.status).toBe(200);
    const v = (await val.json()).data;
    expect(v.estimate.value).toBeGreaterThan(100000);
    expect(v.estimate.low).toBeLessThanOrEqual(v.estimate.value);

    expect((await VAL(call("/api/v1/valuations", key, { method: "POST", body: { lat: 10, lng: 10 } }))).status).toBe(400);
    expect((await VAL(call("/api/v1/valuations", key, { method: "POST", body: { lat: 39, lng: -30, type: "apartment", area: 80 } }))).status).toBe(422);

    const dev = await (await DEV(call("/api/v1/developments?phase=selling&limit=2", key))).json();
    expect(dev.data.length).toBeGreaterThan(0);
    expect(dev.data[0]).toMatchObject({ phase: "selling", isDemo: true });
  });

  it("creates an alert and enforces the monthly API quota (429)", async () => {
    const { POST: ALERT } = await import("@/app/api/v1/alerts/route");
    const { GET } = await import("@/app/api/v1/properties/route");
    const { key } = await user("agency");
    const created = await ALERT(call("/api/v1/alerts", key, { method: "POST", body: { name: "API alert", filters: "tipo=apartment&t=2&m=1111", frequency: "daily" } }));
    expect(created.status).toBe(201);
    expect((await created.json()).data.frequency).toBe("daily");
    expect((await ALERT(call("/api/v1/alerts", key, { method: "POST", body: { filters: "x" } }))).status).toBe(400);

    const capped = await user("agency", 10000);
    const res = await GET(call("/api/v1/properties", capped.key));
    expect(res.status).toBe(429);
    expect((await res.json()).error.code).toBe("quota_exceeded");
  });
});
