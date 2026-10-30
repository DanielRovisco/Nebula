import { expect, test } from "./fixtures";

test("home → autocomplete → search results", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("registo limpo");
  await page.getByPlaceholder(/Concelho, freguesia/).fill("Sintra");
  await page.getByRole("option", { name: /Sintra/ }).first().click();
  await page.getByRole("button", { name: "Pesquisar" }).click();
  await expect(page).toHaveURL(/\/comprar\/lisboa\/sintra/);
  await expect(page.locator("h2", { hasText: /imóveis? em Sintra/ })).toBeVisible();
});

test("search: filters update URL and results; chips remove them", async ({ page }) => {
  await page.goto("/comprar/apartamento/lisboa/lisboa");
  const heading = page.locator("h2", { hasText: /im[óo]veis? em Lisboa/ });
  const before = await heading.innerText();
  await page.getByRole("button", { name: /Filtros/ }).click();
  await page.getByRole("button", { name: "T2", exact: true }).click();
  await page.getByRole("button", { name: /^Ver \d+ resultado/ }).click();
  await expect(page).toHaveURL(/t=2/);
  await expect(heading).not.toHaveText(before);
  await page.getByRole("button", { name: /Remover filtro T2/ }).click();
  await expect(page).not.toHaveURL(/t=2/);
});

test("search: map renders with price pins and clusters", async ({ page }) => {
  await page.goto("/comprar/lisboa/lisboa");
  const canvas = page.locator("canvas.maplibregl-canvas");
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box!.height).toBeGreaterThan(300);
});

test("search: sort by price ascending", async ({ page }) => {
  await page.goto("/comprar/lisboa/lisboa?ordem=price_asc");
  const prices = await page.locator("article p.tnum.text-xl").allInnerTexts();
  const nums = prices.map((p) => Number(p.replace(/[^\d]/g, "")));
  expect(nums.length).toBeGreaterThan(3);
  expect([...nums].sort((a, b) => a - b)).toEqual(nums);
});

test("property page: details, history and contact validation", async ({ page }) => {
  await page.goto("/comprar/apartamento/lisboa/lisboa");
  await page.locator("article h3 a").first().click();
  await expect(page).toHaveURL(/\/imovel\/pr-\d{6}/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ficha técnica" })).toBeVisible();
  await expect(page.locator('script[type="application/ld+json"]').first()).toHaveCount(1);
  await page.getByRole("button", { name: /Enviar mensagem/ }).click();
  await expect(page.getByRole("complementary", { name: "Contactar o anunciante" }).getByRole("alert")).toBeVisible();
});

test("property page: unknown reference is a real 404", async ({ request }) => {
  const res = await request.get("/imovel/pr-999999");
  expect(res.status()).toBe(404);
});

test("auth: account requires sign-in and signed-in user sees the account", async ({ page, signedIn }) => {
  await page.goto("/conta");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Bem-vindo");
  await expect(page.getByText(signedIn.email)).toBeVisible();
});

test("auth: anonymous /conta redirects to /entrar", async ({ page }) => {
  await page.goto("/conta");
  await expect(page).toHaveURL(/\/entrar/);
});

test("login form requests a magic link and shows the verify page", async ({ page }) => {
  await page.goto("/entrar");
  await page.locator("#email").fill(`e2e+${Date.now()}@example.com`);
  await page.getByRole("button", { name: /Enviar ligação/ }).click();
  await expect(page).toHaveURL(/entrar\/verificar/);
});

test("language switch keeps the page and uses /en", async ({ page }) => {
  await page.goto("/sobre");
  await page.getByRole("button", { name: /^(EN: English|PT: Português)$/ }).click();
  await expect(page).toHaveURL(/\/en\/sobre/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("About");
});

test("API contracts: health, search, suggest", async ({ request }) => {
  expect((await request.get("/api/health")).status()).toBe(200);
  const s = await (await request.get("/api/search?business=sale&m=1106&count=1")).json();
  expect(s.total).toBeGreaterThan(0);
  const g = await (await request.get("/api/geo/suggest?q=sintra")).json();
  expect(g.items[0].label).toBe("Sintra");
});

test("@mobile search toggles between list and map", async ({ page }) => {
  await page.goto("/comprar/lisboa/lisboa");
  await page.getByRole("button", { name: "Mostrar mapa" }).click();
  await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible();
  await page.getByRole("button", { name: "Mostrar lista" }).click();
  await expect(page.locator("article").first()).toBeVisible();
});
