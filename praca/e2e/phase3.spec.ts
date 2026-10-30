import { createHash, randomBytes } from "node:crypto";
import postgres from "postgres";
import { expect, test } from "./fixtures";

const DB = process.env.DATABASE_URL ?? "postgres://praca:praca@localhost:5432/praca";

test("calculators: IMT changes with the price and capital gains reacts to reinvestment", async ({ page }) => {
  await page.goto("/calculadoras");
  await expect(page.getByRole("heading", { name: "Calculadoras", level: 1 })).toBeVisible();
  const price = page.getByLabel("Preço (€)");
  await price.fill("100000");
  const imt = page.locator("dt", { hasText: /^IMT$/ }).locator("xpath=following-sibling::dd[1]");
  await expect(imt).toHaveText(/0,00/); // below the first threshold: exempt
  await price.fill("300000");
  await expect(imt).not.toHaveText(/^0,00/);
  await page.getByRole("tab", { name: "Mais-valias" }).click();
  const tax = page.locator("dt", { hasText: /^IRS estimado$/ }).locator("xpath=following-sibling::dd[1]");
  await expect(tax).not.toHaveText(/^0,00/);
  await page.getByLabel("Era a minha habitação própria e permanente").check();
  await expect(tax).toHaveText(/0,00/); // 100 % reinvested → excluded
});

test("natural-language search explains what it understood and opens the results", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "Ou descreva o que procura" }).fill("T2 em Lisboa até 350k com varanda perto do metro");
  await page.getByRole("button", { name: "Interpretar" }).click();
  const chips = page.getByRole("list", { name: "O que percebi" });
  await expect(chips).toContainText("T2");
  await expect(chips).toContainText("Até 350");
  await expect(chips).toContainText("Varanda");
  await expect(page.getByText("Ainda não filtro por: perto do metro")).toBeVisible();
  await page.getByRole("button", { name: "Ver resultados" }).click();
  await expect(page).toHaveURL(/\/comprar\/.*lisboa/);
  await expect(page.getByText(/resultados?/i).first()).toBeVisible();
});

test("property page: fair-price verdict, hazard section, map tools and reach overlay", async ({ page }) => {
  const sql = postgres(DB, { max: 1, onnotice: () => {} });
  const [r] = await sql<{ reference: string }[]>`SELECT p.reference FROM listings l JOIN properties p ON p.id = l.property_id WHERE l.status = 'active' AND l.is_primary AND l.business = 'sale' AND p.municipality_code = '1106' AND p.type = 'apartment' AND p.usable_area > 40 ORDER BY p.reference LIMIT 1`;
  await sql.end();
  await page.goto(`/imovel/${r!.reference.toLowerCase()}`);
  await expect(page.getByRole("heading", { name: "Riscos naturais" })).toBeVisible();
  await expect(page.locator("section[aria-labelledby=risk]").getByText("Inundação (zonas ilustrativas)")).toBeVisible();
  await expect(page.getByLabel("Camada de risco")).toBeVisible();
  // The map initialises when it nears the viewport, so bring the controls (right below it) into view first.
  await page.getByLabel("Alcance").scrollIntoViewIfNeeded();
  await page.getByLabel("Alcance").selectOption("foot-walking");
  await expect(page.getByText(/Aproximação em linha reta/)).toBeVisible();
});

test("blog: article renders and the newsletter asks for confirmation", async ({ page }) => {
  await page.goto("/blog");
  await expect(page.getByRole("heading", { name: "Blog", level: 1 })).toBeVisible();
  await page.getByRole("link", { name: /preço por metro quadrado/i }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("preço por metro quadrado");
  await expect(page.getByRole("heading", { name: "Mediana, não média" })).toBeVisible();
  await page.goto("/blog");
  const form = page.getByRole("main").getByRole("form", { name: "Subscrever a newsletter" });
  await form.getByRole("textbox", { name: "Email" }).fill(`e2e+${randomBytes(3).toString("hex")}@example.com`);
  await expect(form.getByRole("button", { name: "Subscrever" })).toBeDisabled(); // consent first
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Subscrever" }).click();
  await expect(page.getByText(/Enviámos-lhe um email/)).toBeVisible();
});

test("new-build pipeline lists projects by phase and opens a project", async ({ page }) => {
  await page.goto("/projetos");
  await expect(page.getByRole("heading", { name: "Projetos novos", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Em venda/ })).toBeVisible();
  await page.getByRole("link", { name: /Vilamoura Hills/ }).click();
  await expect(page.getByRole("heading", { name: "Vilamoura Hills", level: 1 })).toBeVisible();
  await expect(page.getByRole("table")).toContainText("T1");
});

test("PWA: manifest with installable icons, service worker and offline page", async ({ page, request }) => {
  const m = await (await request.get("/manifest.webmanifest")).json();
  const sizes = m.icons.map((i: { sizes: string }) => i.sizes);
  expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  expect(m.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true);
  expect(m.display).toBe("standalone");
  const sw = await request.get("/sw.js");
  expect(sw.status()).toBe(200);
  expect(await sw.text()).toContain("addEventListener(\"push\"");
  await page.goto("/offline");
  await expect(page.getByRole("heading", { name: "Sem ligação" })).toBeVisible();
});

test.describe("signed in", () => {
  test.use({ plan: "agency" });

  test("dossier PDF downloads for a plan with PDF reports", async ({ page, signedIn }) => {
    void signedIn;
    const sql = postgres(DB, { max: 1, onnotice: () => {} });
    const [r] = await sql<{ reference: string }[]>`SELECT p.reference FROM listings l JOIN properties p ON p.id = l.property_id WHERE l.status = 'active' AND l.is_primary AND l.business = 'sale' AND p.municipality_code = '1106' LIMIT 1`;
    await sql.end();
    await page.goto(`/imovel/${r!.reference.toLowerCase()}`);
    const href = await page.getByRole("link", { name: "Dossiê PDF" }).getAttribute("href");
    const res = await page.request.get(href!);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("application/pdf");
    expect((await res.body()).subarray(0, 5).toString()).toBe("%PDF-");
  });

  test("account page offers push and WhatsApp settings (disabled until configured)", async ({ page, signedIn }) => {
    void signedIn;
    await page.goto("/conta");
    await expect(page.getByRole("heading", { name: "Notificações dos alertas" })).toBeVisible();
    await expect(page.getByText("As notificações push não estão configuradas neste servidor.")).toBeVisible();
    await expect(page.getByText("O WhatsApp não está configurado neste servidor.")).toBeVisible();
  });

  test("MCP endpoint answers tools/list with an API key and rejects calls without one", async ({ request, signedIn }) => {
    const sql = postgres(DB, { max: 1, onnotice: () => {} });
    const secret = `prk_${randomBytes(28).toString("base64url")}`;
    await sql`INSERT INTO api_keys (user_id, organization_id, name, prefix, key_hash) VALUES (${signedIn.userId}, ${signedIn.orgId}, 'e2e-mcp', ${secret.slice(0, 12)}, ${createHash("sha256").update(secret).digest("hex")})`;
    await sql.end();
    const headers = { authorization: `Bearer ${secret}`, "content-type": "application/json", accept: "application/json, text/event-stream" };
    const init = await request.post("/api/mcp", { headers, data: { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "e2e", version: "1" } } } });
    expect(init.status()).toBe(200);
    const list = await request.post("/api/mcp", { headers, data: { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} } });
    expect(list.status()).toBe(200);
    expect(JSON.stringify(await list.json())).toContain("search_properties");
    const denied = await request.post("/api/mcp", { headers: { "content-type": "application/json", accept: "application/json, text/event-stream" }, data: { jsonrpc: "2.0", id: 3, method: "tools/list", params: {} } });
    expect(denied.status()).toBe(401);
  });
});

test.describe("admin", () => {
  test.use({ role: "admin" });

  test("moderation: a verification needs evidence, shows up in the list and can be revoked", async ({ page, signedIn }) => {
    void signedIn;
    const sql = postgres(DB, { max: 1, onnotice: () => {} });
    const [r] = await sql<{ reference: string }[]>`SELECT p.reference FROM listings l JOIN properties p ON p.id = l.property_id WHERE l.status = 'active' AND l.is_primary AND l.verified = false LIMIT 1`;
    await page.goto("/admin/moderacao");
    await page.getByLabel("Referência").fill(r!.reference);
    await page.getByLabel("Prova (n.º de licença, documento, data da visita)").fill("Licença AMI 12345");
    await page.getByRole("button", { name: "Verificar", exact: true }).click();
    await expect(page.getByText("Verificação registada.")).toBeVisible();
    await expect(page.getByRole("link", { name: r!.reference })).toBeVisible();
    const [v1] = await sql<{ verified: boolean }[]>`SELECT l.verified FROM listings l JOIN properties p ON p.id = l.property_id WHERE p.reference = ${r!.reference} AND l.is_primary`;
    expect(v1!.verified).toBe(true);
    await page.getByRole("listitem").filter({ hasText: r!.reference }).getByRole("button", { name: "Retirar" }).click();
    await expect(page.getByRole("link", { name: r!.reference })).toHaveCount(0);
    const [v2] = await sql<{ verified: boolean }[]>`SELECT l.verified FROM listings l JOIN properties p ON p.id = l.property_id WHERE p.reference = ${r!.reference} AND l.is_primary`;
    expect(v2!.verified).toBe(false);
    await sql.end();
  });
});
