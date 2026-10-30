import { afterAll, describe, expect, it } from "vitest";

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

describe.skipIf(!hasDb)("MCP server (database)", () => {
  afterAll(async () => {
    const { sql } = await import("@/db");
    await sql.end();
  });

  async function connect() {
    const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
    const { InMemoryTransport } = await import("@modelcontextprotocol/sdk/inMemory.js");
    const { createPracaMcpServer } = await import("./server");
    const [a, b] = InMemoryTransport.createLinkedPair();
    const server = createPracaMcpServer();
    await server.connect(b);
    const client = new Client({ name: "test", version: "1" });
    await client.connect(a);
    return client;
  }
  const json = (r: unknown) => JSON.parse((r as { content: { text: string }[] }).content[0]!.text);

  it("lists the tools and answers search, property, market, estimate and cost queries", async () => {
    const client = await connect();
    const tools = (await client.listTools()).tools.map((t) => t.name).sort();
    expect(tools).toEqual(["estimate_value", "get_property", "interpret_query", "market_stats", "purchase_costs", "search_properties"]);

    const found = json(await client.callTool({ name: "search_properties", arguments: { business: "sale", place: "Lisboa", types: ["apartment"], typologies: [2], price_max: 600000, limit: 3 } }));
    expect(found.total).toBeGreaterThan(0);
    expect(found.results.length).toBeLessThanOrEqual(3);
    expect(found.results[0].price).toBeLessThanOrEqual(600000);
    expect(found.results[0].isDemo).toBe(true);

    const p = json(await client.callTool({ name: "get_property", arguments: { reference: found.results[0].reference } }));
    expect(p.reference).toBe(found.results[0].reference);
    expect(Array.isArray(p.risks)).toBe(true);

    const missing = await client.callTool({ name: "get_property", arguments: { reference: "PR-999999" } });
    expect(missing.isError).toBe(true);

    const market = json(await client.callTool({ name: "market_stats", arguments: { geo_id: "1106" } }));
    expect(market.indicators.medianPricePerM2).toBeGreaterThan(500);

    const est = json(await client.callTool({ name: "estimate_value", arguments: { lat: 38.7369, lng: -9.1427, type: "apartment", typology: 2, area: 80 } }));
    expect(est.sale.low).toBeLessThanOrEqual(est.sale.value);

    const costs = json(await client.callTool({ name: "purchase_costs", arguments: { price: 300000, kind: "hpp", down_payment: 60000 } }));
    expect(costs.totalTaxes).toBeGreaterThan(0);
    expect(costs.mortgage.principal).toBe(240000);

    const nl = json(await client.callTool({ name: "interpret_query", arguments: { text: "T2 em Lisboa até 350k com varanda" } }));
    expect(nl.url).toContain("/comprar");
    expect(nl.understood).toContain("Varanda");

    const bad = await client.callTool({ name: "search_properties", arguments: { place: "Zzzzxqj" } });
    expect(bad.isError).toBe(true);
    await client.close();
  });
});
