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

describe.skipIf(!hasDb)("fraud signals and verification (database)", () => {
  const made: { property?: string } = {};
  afterAll(async () => {
    const { sql } = await import("@/db");
    if (made.property) await sql`DELETE FROM properties WHERE id = ${made.property}`;
    await sql.end();
  });

  it("flags a scam-looking listing, quarantines it, and a stored verification keeps/restores trust", async () => {
    const { sql } = await import("@/db");
    const { recomputeFraudSignals, signalsFor } = await import("./fraud");
    const { verifyListing, revokeVerification } = await import("./verification");
    const [src] = await sql<{ id: string }[]>`SELECT id FROM sources WHERE slug = 'seed-feed-a'`;
    const [p] = await sql<{ id: string }[]>`
      INSERT INTO properties (reference, fingerprint, type, typology, usable_area, district_code, municipality_code, parish_code, lat, lng, is_seed)
      VALUES (${`PR-F${Date.now() % 100000}`}, 'fraud-test', 'apartment', 2, 80, '11', '1106', (SELECT code FROM geo_parishes WHERE municipality_code = '1106' LIMIT 1), 38.7369, -9.1427, true) RETURNING id`;
    made.property = p!.id;
    // 1 000 €/m² in Lisbon + advance-payment language: far below the zone median and a payment request.
    const [l] = await sql<{ id: string }[]>`
      INSERT INTO listings (property_id, source_id, external_id, business, price, initial_price, price_per_m2, advertiser_type, advertiser_name, title, description, published_at, is_seed, is_primary)
      VALUES (${p!.id}, ${src!.id}, ${`fraud-${Date.now()}`}, 'sale', 80000, 80000, 1000, 'private', 'Anunciante Teste', 'T2 em Lisboa', 'Envie um sinal por transferência antes da visita.', now(), true, true) RETURNING id`;

    const run = await recomputeFraudSignals();
    expect(run.scanned).toBeGreaterThan(100);
    const sig = await signalsFor(l!.id);
    expect(sig.map((s) => s.code).sort()).toEqual(["advance_payment_request", "price_far_below_market"]);
    const [after] = await sql<{ status: string; fraud_score: number }[]>`SELECT status::text, fraud_score FROM listings WHERE id = ${l!.id}`;
    expect(after!.fraud_score).toBe(80);
    expect(after!.status).toBe("pending_review");

    // Re-running changes nothing (idempotent).
    await recomputeFraudSignals(l!.id);
    expect((await signalsFor(l!.id)).length).toBe(2);

    // The seeded market is not flagged wholesale.
    const [seeded] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM listings WHERE is_seed AND status = 'active' AND fraud_score >= 60`;
    expect(seeded!.n).toBeLessThan(10);

    // Verification evidence sets and clears the badge.
    await sql`UPDATE listings SET status = 'active' WHERE id = ${l!.id}`;
    await verifyListing(l!.id, "owner_document", "Caderneta predial 2026", null);
    expect((await sql`SELECT verified FROM listings WHERE id = ${l!.id}`)[0]!.verified).toBe(true);
    await recomputeFraudSignals(l!.id);
    expect((await sql`SELECT status::text FROM listings WHERE id = ${l!.id}`)[0]!.status).toBe("active"); // verified: not quarantined
    const [v] = await sql<{ id: string }[]>`SELECT id FROM listing_verifications WHERE listing_id = ${l!.id}`;
    await revokeVerification(v!.id);
    expect((await sql`SELECT verified FROM listings WHERE id = ${l!.id}`)[0]!.verified).toBe(false);
  });
});
