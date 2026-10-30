import AxeBuilder from "@axe-core/playwright";
import postgres from "postgres";
import { expect, test } from "./fixtures";

const DB = process.env.DATABASE_URL ?? "postgres://praca:praca@localhost:5432/praca";

/** WCAG 2.2 A/AA automated checks on the main templates, light and dark. Serious and critical findings fail the build. */
async function ref() {
  const sql = postgres(DB, { max: 1, onnotice: () => {} });
  const [r] = await sql<{ reference: string }[]>`SELECT p.reference FROM listings l JOIN properties p ON p.id = l.property_id WHERE l.status = 'active' AND l.is_primary AND l.business = 'sale' AND p.municipality_code = '1106' AND p.type = 'apartment' ORDER BY p.reference LIMIT 1`;
  await sql.end();
  return r!.reference.toLowerCase();
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`axe ${scheme}`, () => {
    test.use({ colorScheme: scheme });
    const pages: [string, () => Promise<string>][] = [
      ["home", async () => "/"],
      ["search", async () => "/comprar/apartamento/lisboa/lisboa"],
      ["property", async () => `/imovel/${await ref()}`],
      ["market", async () => "/mercado"],
      ["calculators", async () => "/calculadoras"],
      ["blog", async () => "/blog"],
      ["projects", async () => "/projetos"],
      ["plans", async () => "/planos"],
    ];
    for (const [name, url] of pages) {
      test(name, async ({ page }) => {
        await page.goto(await url());
        await page.waitForTimeout(1200); // maps and charts settle
        const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
        const bad = res.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
        expect(bad.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
      });
    }
  });
}
