import postgres from "postgres";
import { expect, test } from "./fixtures";

const DB = process.env.DATABASE_URL ?? "postgres://praca:praca@localhost:5432/praca";

test("market page shows INE registered sales next to asking prices, with the source", async ({ page }) => {
  const sql = postgres(DB, { max: 1, onnotice: () => {} });
  const [t] = await sql<{ ppm: number }[]>`SELECT median_price_per_m2::float8 AS ppm FROM transactions WHERE geo_level = 'municipality' AND geo_code = '1106' AND source LIKE 'INE%' ORDER BY period DESC LIMIT 1`;
  await sql.end();
  test.skip(!t, "run `pnpm sources:sync` to load the INE data first");
  await page.goto("/mercado/lisboa/lisboa");
  const section = page.locator("section[aria-labelledby=tx]");
  await expect(section.getByRole("heading", { name: "Preço pedido e preço de vendas registadas" })).toBeVisible();
  await expect(section).toContainText("INE, Estatísticas de preços da habitação");
  await expect(section).toContainText("CC BY 4.0");
});
