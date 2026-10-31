import postgres from "postgres";
import { expect, test } from "./fixtures";

const DB = process.env.DATABASE_URL ?? "postgres://praca:praca@localhost:5432/praca";

/** Phone-width checks (Pixel 7): no horizontal page scroll, primary navigation reachable, key tools usable. */
async function noHorizontalScroll(page: import("@playwright/test").Page, url = "") {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `horizontal overflow on ${url}`).toBeLessThanOrEqual(1);
}

test("@mobile key pages never scroll sideways and the bottom navigation works", async ({ page }) => {
  const sql = postgres(DB, { max: 1, onnotice: () => {} });
  const [r] = await sql<{ reference: string }[]>`SELECT p.reference FROM listings l JOIN properties p ON p.id = l.property_id WHERE l.status = 'active' AND l.is_primary AND l.business = 'sale' AND p.municipality_code = '1106' AND p.type = 'apartment' ORDER BY p.reference LIMIT 1`;
  await sql.end();
  for (const url of ["/", "/comprar/apartamento/lisboa/lisboa", `/imovel/${r!.reference.toLowerCase()}`, "/mercado", "/calculadoras", "/blog", "/projetos", "/planos"]) {
    await page.goto(url);
    await noHorizontalScroll(page, url);
  }
  await page.goto("/");
  await page.getByRole("navigation", { name: "Navegação móvel" }).getByRole("link", { name: "Mercado" }).click();
  await expect(page).toHaveURL(/\/mercado/);
});

test("@mobile search switches between list and map", async ({ page }) => {
  await page.goto("/comprar/apartamento/lisboa/lisboa");
  const toggle = page.getByRole("button", { name: "Mostrar mapa" });
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page.locator(".maplibregl-canvas").first()).toBeVisible({ timeout: 15_000 });
});

test("@mobile calculators and natural-language search are usable with touch", async ({ page }) => {
  await page.goto("/calculadoras");
  await page.getByLabel("Preço (€)").fill("250000");
  await expect(page.locator("dt", { hasText: /^IMT$/ }).locator("xpath=following-sibling::dd[1]")).not.toHaveText(/^—$/);
  await page.getByRole("tab", { name: "Arrendamento" }).click();
  await expect(page.getByLabel("Taxa de IRS sobre rendas (%)")).toHaveValue("25");
  await page.goto("/");
  await page.getByRole("textbox", { name: "Ou descreva o que procura" }).fill("T3 em Porto até 400k");
  await page.getByRole("button", { name: "Interpretar" }).click();
  await expect(page.getByRole("list", { name: "O que percebi" })).toContainText("T3");
});
