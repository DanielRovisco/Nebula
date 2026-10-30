import { afterAll, beforeAll, describe, expect, it } from "vitest";

const hasDb = await (async () => {
  if (!process.env.DATABASE_URL) return false;
  try {
    const postgres = (await import("postgres")).default;
    const c = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 3 });
    const [r] = await c`select count(*)::int as n from sources where slug = 'seed-feed-a'`;
    await c.end();
    return (r?.n ?? 0) > 0;
  } catch {
    return false;
  }
})();

describe.skipIf(!hasDb)("push and WhatsApp channels (database)", () => {
  let sql: typeof import("@/db").sql;
  const ids: { user?: string; property?: string } = {};
  const env = { ...process.env };
  beforeAll(async () => {
    ({ sql } = await import("@/db"));
    Object.assign(process.env, { WHATSAPP_TOKEN: "t", WHATSAPP_PHONE_ID: "123", WHATSAPP_ALERT_TEMPLATE: "novidade_alerta", WHATSAPP_CODE_TEMPLATE: "codigo_verificacao" });
  });
  afterAll(async () => {
    process.env = env;
    if (ids.property) await sql`DELETE FROM properties WHERE id = ${ids.property}`;
    if (ids.user) await sql`DELETE FROM users WHERE id = ${ids.user}`;
    await sql.end();
  });

  it("verifies a phone by code, locks after 5 wrong tries, and queues/sends alerts on the verified channel only", async () => {
    const n = await import("./notify");
    const { runAlertEngine } = await import("./alerts");
    const [u] = await sql<{ id: string }[]>`INSERT INTO users (email, name, onboarded_at) VALUES (${`notify-test+${Date.now()}@example.com`}, 'Notify', now()) RETURNING id`;
    ids.user = u!.id;

    const calls: { url: string; body: { to: string; template: { name: string; components: { parameters: { text: string }[] }[] } } }[] = [];
    const fakeFetch = (async (url: string, init: { body: string }) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;

    expect(await n.requestWhatsAppCode(u!.id, "12", fakeFetch)).toBe("invalid_phone");
    expect(await n.requestWhatsAppCode(u!.id, "912 345 678", fakeFetch)).toBe("sent");
    expect(calls[0]!.body.to).toBe("351912345678");
    expect(calls[0]!.body.template.name).toBe("codigo_verificacao");
    const code = calls[0]!.body.template.components[0]!.parameters[0]!.text;
    expect(await n.requestWhatsAppCode(u!.id, "912345678", fakeFetch)).toBe("too_soon");

    expect(await n.verifyWhatsAppCode(u!.id, code === "000000" ? "111111" : "000000")).toBe("wrong");
    expect((await n.whatsappStatus(u!.id))?.verified).toBe(false);
    expect(await n.verifyWhatsAppCode(u!.id, code)).toBe("ok");
    expect((await n.whatsappStatus(u!.id))?.verified).toBe(true);
    expect((await n.whatsappStatus(u!.id))?.phone).toMatch(/^\+•+\d{3}$/); // masked

    // An alert on a new matching listing queues email + whatsapp (no push device registered).
    const [s] = await sql<{ id: string }[]>`INSERT INTO saved_searches (user_id, name, filters) VALUES (${u!.id}, 'Lisboa T2', ${sql.json({ business: "sale", qs: "m=1106&t=2&pmax=900000", geoSlugs: {} })}) RETURNING id`;
    await sql`INSERT INTO alerts (saved_search_id, user_id, frequency, triggers, unsubscribe_token) VALUES (${s!.id}, ${u!.id}, 'instant', ARRAY['new_listing']::alert_trigger[], ${`tok${Math.random().toString(36).slice(2)}${Date.now()}`})`;
    const [src] = await sql<{ id: string }[]>`SELECT id FROM sources WHERE slug = 'seed-feed-a'`;
    const [p] = await sql<{ id: string }[]>`
      INSERT INTO properties (reference, fingerprint, type, typology, usable_area, district_code, municipality_code, parish_code, lat, lng, is_seed)
      VALUES (${`PR-N${Date.now() % 100000}`}, 'test', 'apartment', 2, 80, '11', '1106', (SELECT code FROM geo_parishes WHERE municipality_code = '1106' LIMIT 1), 38.7369, -9.1427, true) RETURNING id`;
    ids.property = p!.id;
    const [l] = await sql<{ id: string }[]>`
      INSERT INTO listings (property_id, source_id, external_id, business, price, initial_price, price_per_m2, advertiser_type, title, published_at, is_seed)
      VALUES (${p!.id}, ${src!.id}, ${`notify-test-${Date.now()}`}, 'sale', 450000, 450000, 5625, 'professional', 'Apartamento T2 de teste', now(), true) RETURNING id`;
    await sql`INSERT INTO listing_events (listing_id, property_id, type, to_price) VALUES (${l!.id}, ${p!.id}, 'published', 450000)`;
    await runAlertEngine();
    const ch = await sql<{ channel: string }[]>`SELECT d.channel FROM alert_deliveries d JOIN alerts a ON a.id = d.alert_id WHERE a.user_id = ${u!.id} ORDER BY 1`;
    expect(ch.map((c) => c.channel)).toEqual(["email", "whatsapp"]);

    calls.length = 0;
    const res = await n.sendChannelDigests("instant", fakeFetch);
    expect(res.whatsapp).toBe(1);
    const alertCall = calls.find((c) => c.body.template.name === "novidade_alerta");
    expect(alertCall?.body.template.components[0]!.parameters[0]!.text).toBe("Lisboa T2");
    const st = await sql<{ channel: string; status: string }[]>`SELECT d.channel, d.status FROM alert_deliveries d JOIN alerts a ON a.id = d.alert_id WHERE a.user_id = ${u!.id} ORDER BY 1`;
    expect(st).toEqual([{ channel: "email", status: "queued" }, { channel: "whatsapp", status: "sent" }]);
  });

  it("locks verification after five wrong codes", async () => {
    const n = await import("./notify");
    const [u] = await sql<{ id: string }[]>`INSERT INTO users (email, name, onboarded_at) VALUES (${`notify-lock+${Date.now()}@example.com`}, 'Lock', now()) RETURNING id`;
    const fakeFetch = (async () => new Response("{}", { status: 200 })) as unknown as typeof fetch;
    await n.requestWhatsAppCode(u!.id, "+351912345678", fakeFetch);
    const results: string[] = [];
    for (let i = 0; i < 6; i++) results.push(await n.verifyWhatsAppCode(u!.id, "00000" + i));
    expect(results.slice(0, 5).every((r) => r === "wrong" || r === "ok")).toBe(true);
    expect(results[5]).toBe("locked");
    await sql`DELETE FROM users WHERE id = ${u!.id}`;
  });
});
