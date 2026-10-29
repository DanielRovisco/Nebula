import postgres from "postgres";
import { computeIndicators, monthStart } from "../src/server/indicators";
import { uuidv7 } from "../src/lib/ids";
import { AGENCIES } from "./seed/catalog";
import { generate } from "./seed/generate";
import { loadParishRefs, seedGeo } from "./seed/geo";
import { hashString } from "../src/lib/rng";
import { loadEnv } from "./_env";

loadEnv();

const TARGET = Number(process.env.SEED_PROPERTIES ?? 5000);

async function insertChunks(sql: postgres.Sql, table: string, rows: Record<string, unknown>[], size = 700) {
  for (let i = 0; i < rows.length; i += size) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await sql`INSERT INTO ${sql(table)} ${sql(rows.slice(i, i + size) as any)}`;
  }
}

async function seedReference(sql: postgres.Sql) {
  // ── fiscal tables (configurable, never hardcoded in code; see docs/FISCAL.md) ──
  const fiscal = [
    {
      tax: "imt", scope: "hpp_mainland", valid_from: "2026-01-01",
      brackets: [
        { upTo: 106346, rate: 0, deduction: 0 },
        { upTo: 145470, rate: 0.02, deduction: 2126.92 },
        { upTo: 198347, rate: 0.05, deduction: 6491.02 },
        { upTo: 330539, rate: 0.07, deduction: 10457.96 },
        { upTo: 660982, rate: 0.08, deduction: 13763.35 },
        { upTo: 1150853, rate: 0.06, deduction: 0, flat: true },
        { upTo: null, rate: 0.075, deduction: 0, flat: true },
      ],
      source_note: "IMT, habitação própria permanente, Continente, escalões 2026 (+2 %). Referência: Ofício-Circulado n.º 40129/2026 da AT, conforme divulgado pela imprensa — CONFIRMAR no Portal das Finanças antes de ir para produção.",
    },
    {
      tax: "imt", scope: "other_urban", valid_from: "2026-01-01",
      brackets: [{ upTo: null, rate: 0.065, deduction: 0, flat: true }],
      source_note: "IMT, prédios urbanos para outros fins (taxa única indicativa). CONFIRMAR no CIMT (art. 17.º) / Portal das Finanças.",
    },
    {
      tax: "stamp_duty_purchase", scope: "all", valid_from: "2026-01-01",
      brackets: [{ upTo: null, rate: 0.008, deduction: 0, flat: true }],
      source_note: "Imposto do Selo na aquisição onerosa de imóveis (Verba 1.1 da TGIS), 0,8 %. CONFIRMAR no Portal das Finanças.",
    },
    {
      tax: "stamp_duty_credit", scope: "all", valid_from: "2026-01-01",
      brackets: [{ upTo: null, rate: 0.006, deduction: 0, flat: true }],
      source_note: "Imposto do Selo sobre o crédito à habitação (prazo ≥ 5 anos) — valor indicativo. CONFIRMAR na TGIS (Verba 17).",
    },
  ];
  for (const f of fiscal) {
    await sql`INSERT INTO fiscal_tables ${sql({ ...f, brackets: sql.json(f.brackets), verified_at: null })}
              ON CONFLICT (tax, scope, valid_from) DO UPDATE SET brackets = EXCLUDED.brackets, source_note = EXCLUDED.source_note`;
  }
  const rates = [
    ["euribor_3m", 2.425], ["euribor_6m", 2.647], ["euribor_12m", 2.855],
  ] as const;
  for (const [code, value] of rates) {
    await sql`INSERT INTO rates (code, valid_from, value, source, is_seed)
              VALUES (${code}, '2026-07-01', ${value}, 'Média mensal julho/2026 (imprensa). Valor ilustrativo até o job do Banco de Portugal/EMMI estar ligado.', true)
              ON CONFLICT (code, valid_from) DO UPDATE SET value = EXCLUDED.value`;
  }

  // ── entitlements per plan ──
  const ent: [string, string, number | null, boolean][] = [
    ["free", "alerts", 3, true], ["free", "valuations", 0, false], ["free", "exports", 0, false], ["free", "fsbo", null, false],
    ["free", "pdf_reports", 0, false], ["free", "crm", null, false], ["free", "api_calls", 0, false], ["free", "seats", 1, true],
    ["pro", "alerts", null, true], ["pro", "valuations", 100, true], ["pro", "exports", 5000, true], ["pro", "fsbo", null, true],
    ["pro", "pdf_reports", 100, true], ["pro", "crm", null, false], ["pro", "api_calls", 0, false], ["pro", "seats", 1, true],
    ["agency", "alerts", null, true], ["agency", "valuations", 1000, true], ["agency", "exports", 50000, true], ["agency", "fsbo", null, true],
    ["agency", "pdf_reports", 1000, true], ["agency", "crm", null, true], ["agency", "api_calls", 10000, true], ["agency", "seats", 50, true],
  ];
  for (const [plan, feature, limit, enabled] of ent) {
    await sql`INSERT INTO entitlements (plan, feature, limit_value, enabled) VALUES (${plan}, ${feature}, ${limit}, ${enabled})
              ON CONFLICT (plan, feature) DO UPDATE SET limit_value = EXCLUDED.limit_value, enabled = EXCLUDED.enabled`;
  }
}

async function seedSourcesAndAgencies(sql: postgres.Sql) {
  const src = [
    ["seed-feed-a", "Feed de demonstração A (formato Kyero)", "xml_feed", "kyero"],
    ["seed-feed-b", "Feed de demonstração B (CSV)", "csv", "custom_csv"],
    ["seed-feed-c", "Feed de demonstração C (API JSON)", "json_api", "json"],
    ["seed-private", "Particulares (demonstração)", "seed", null],
  ] as const;
  const ids: Record<string, string> = {};
  for (const [slug, name, kind, format] of src) {
    const [r] = await sql<{ id: string }[]>`
      INSERT INTO sources (slug, name, kind, licence, format, is_seed, enabled, frequency_minutes)
      VALUES (${slug}, ${name}, ${kind}, 'Dados sintéticos gerados localmente (pnpm db:seed). Sem terceiros.', ${format}, true, true, null)
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`;
    ids[slug] = r!.id;
  }
  const agencies: { id: string; name: string; verified: boolean }[] = [];
  for (let i = 0; i < AGENCIES.length; i++) {
    const name = AGENCIES[i]!;
    const slug = `demo-${name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-")}`;
    const verified = i % 5 !== 4;
    const [r] = await sql<{ id: string }[]>`
      INSERT INTO organizations (name, slug, kind, verified, plan)
      VALUES (${name + " (demo)"}, ${slug}, 'agency', ${verified}, 'agency')
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`;
    agencies.push({ id: r!.id, name, verified });
  }
  return { ids, agencies };
}

async function seedHistory(sql: postgres.Sql) {
  const period = monthStart();
  const cur = await sql<
    { geo_level: string; geo_code: string; business: string; median_price_per_m2: number; p25_price_per_m2: number; p75_price_per_m2: number; median_price: number; n: number; gross_yield: number | null; median_days_on_market: number | null; avg_asking_discount: number | null; aggregated_from: string | null }[]
  >`SELECT geo_level, geo_code, business, median_price_per_m2::float8, p25_price_per_m2::float8, p75_price_per_m2::float8, median_price::float8,
           n, gross_yield::float8, median_days_on_market, avg_asking_discount::float8, aggregated_from
    FROM market_indicators WHERE period = ${period}::date AND source = 'computed'`;
  await sql`DELETE FROM market_indicators WHERE source = 'seed:synthetic-history'`;
  const rows: Record<string, unknown>[] = [];
  for (const r of cur) {
    const h = hashString(`${r.geo_level}:${r.geo_code}`) % 1000;
    const g = (r.business === "sale" ? 0.065 : 0.045) + (h / 1000 - 0.5) * 0.05; // synthetic annual growth
    for (let t = 1; t <= 35; t++) {
      const d = new Date(period + "T00:00:00Z");
      d.setUTCMonth(d.getUTCMonth() - t);
      const f = 1 / Math.pow(1 + g, t / 12) * (1 + 0.006 * Math.sin(t * 1.7 + h));
      rows.push({
        geo_level: r.geo_level, geo_code: r.geo_code, business: r.business, period: d.toISOString().slice(0, 10),
        median_price_per_m2: Math.round(r.median_price_per_m2 * f * 100) / 100,
        p25_price_per_m2: Math.round(r.p25_price_per_m2 * f * 100) / 100,
        p75_price_per_m2: Math.round(r.p75_price_per_m2 * f * 100) / 100,
        median_price: Math.round(r.median_price * f),
        n: Math.max(3, Math.round(r.n * (0.7 + 0.3 * Math.abs(Math.sin(t + h))))),
        gross_yield: r.gross_yield, median_days_on_market: r.median_days_on_market, avg_asking_discount: r.avg_asking_discount,
        aggregated_from: r.aggregated_from, source: "seed:synthetic-history", is_seed: true,
      });
    }
  }
  await insertChunks(sql, "market_indicators", rows, 1500);
  return rows.length;
}

const ARTICLES = [
  {
    slug: "como-ler-o-preco-por-metro-quadrado",
    title: "Como ler o preço por metro quadrado de uma zona",
    excerpt: "A mediana, o intervalo e a amostra: o que cada número diz e o que não diz.",
    tags: ["metodologia", "guia"],
    body: `O preço por metro quadrado é o indicador mais citado do mercado, e o mais mal lido.\n\n## Mediana, não média\nUsamos a **mediana** porque um único palacete não deve mexer no valor de uma freguesia inteira. Antes de a calcular, retiramos os 2 % mais baixos e os 2 % mais altos de cada grupo.\n\n## A amostra importa\nSó publicamos um valor com **pelo menos 10 imóveis**. Abaixo disso, mostramos o valor do nível geográfico acima e dizemo-lo.\n\n## Preço pedido não é preço de fecho\nO que vê no portal é o preço pedido. O preço de fecho só entra quando há uma fonte licenciada de transações, e vem sempre identificada.`,
  },
  {
    slug: "preco-justo-como-funciona",
    title: "Preço justo: como comparamos um anúncio com os semelhantes",
    excerpt: "Selecionamos imóveis parecidos, ajustamos as diferenças e mostramos a conta.",
    tags: ["avaliação", "guia"],
    body: `Para dizer se um anúncio está caro ou barato, comparamos com imóveis **semelhantes e próximos**: mesma tipologia, área parecida, idade e estado comparáveis, e anunciados recentemente.\n\n## O que ajustamos\nÁrea, estado de conservação e andar. Cada ajuste aparece na ficha do imóvel.\n\n## O que não sabemos\nNão vemos o interior, a exposição solar nem o ruído da rua. Use o intervalo como ponto de partida para a visita, não como veredito.`,
  },
  {
    slug: "custos-de-compra-de-casa-em-portugal",
    title: "Quanto custa realmente comprar casa: IMT, selo e escritura",
    excerpt: "Além do preço, há impostos e despesas. Saiba o que entra na conta.",
    tags: ["compra", "fiscal"],
    body: `Além do preço de compra, conte com **IMT**, **Imposto do Selo** (0,8 % do valor), registo e escritura.\n\nOs escalões do IMT são atualizados todos os anos e dependem de a casa ser para habitação própria e permanente. As nossas calculadoras leem as tabelas de uma base de dados com data de início de vigência, e cada tabela indica onde confirmar o valor oficial.\n\n> Os valores são indicativos. Confirme sempre no Portal das Finanças.`,
  },
];

async function main() {
  const sql = postgres(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL!, { max: 4, onnotice: () => {} });
  const t0 = Date.now();
  try {
    console.log("→ geografia (CAOP)…");
    console.log("  ", await seedGeo(sql));

    console.log("→ tabelas fiscais, taxas, quotas…");
    await seedReference(sql);

    console.log("→ fontes e agências de demonstração…");
    const { ids, agencies } = await seedSourcesAndAgencies(sql);

    console.log("→ a limpar dados de demonstração anteriores…");
    await sql`DELETE FROM listings WHERE is_seed`;
    await sql`DELETE FROM properties WHERE is_seed`;
    await sql`DELETE FROM geo_postcodes WHERE is_seed`;
    await sql`DELETE FROM market_indicators WHERE is_seed OR source = 'computed'`;

    console.log(`→ a gerar ~${TARGET} imóveis sintéticos…`);
    const parishes = loadParishRefs();
    const out = generate(parishes, {
      sourceIds: [ids["seed-feed-a"]!, ids["seed-feed-b"]!, ids["seed-feed-c"]!],
      privateSourceId: ids["seed-private"]!,
      agencies,
      now: new Date(),
      target: TARGET,
    });
    console.log("  ", out.stats);

    await insertChunks(sql, "properties", out.properties, 500);
    await insertChunks(sql, "listings", out.listings, 400);
    await insertChunks(sql, "listing_price_history", out.priceHistory, 2000);
    await insertChunks(sql, "listing_events", out.events, 1500);
    await insertChunks(sql, "listing_media", out.media, 3000);
    await insertChunks(
      sql,
      "geo_postcodes",
      [...out.postcodes.values()].map((p) => ({ code: p.code, parish_code: p.parish, lat: p.lat, lng: p.lng, is_seed: true, n: 1 })),
      1500,
    );
    // Postcodes can collide across parishes (synthetic): the unique index keeps the first. Done via ON CONFLICT above? handled below.

    console.log("→ indicadores de mercado…");
    await computeIndicators(sql);
    const hist = await seedHistory(sql);
    const res = await computeIndicators(sql); // second pass picks up yoy/qoq from the synthetic history
    console.log("  ", { history: hist, current: res.rows });

    console.log("→ artigos…");
    for (const a of ARTICLES) {
      await sql`INSERT INTO articles (id, slug, title, excerpt, body, tags, locale, published_at)
                VALUES (${uuidv7()}, ${a.slug}, ${a.title}, ${a.excerpt}, ${a.body}, ${a.tags}, 'pt', now() - interval '3 days')
                ON CONFLICT (slug, locale) DO UPDATE SET title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, body = EXCLUDED.body`;
    }
    console.log(`✓ seed concluído em ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
