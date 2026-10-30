import { expect, test } from "./fixtures";

const LISBON = "/comprar/apartamento/lisboa/lisboa";

test.describe("favourites, comparison and saved searches", () => {
  test("favourite a property, see it in the account, compare two", async ({ page, signedIn }) => {
    void signedIn;
    await page.goto(LISBON);
    const first = page.locator("article").first();
    const title = await first.locator("h3 a").innerText();
    await first.getByRole("button", { name: "Guardar nos favoritos" }).click();
    await expect(first.getByRole("button", { name: "Remover dos favoritos" })).toBeVisible();
    await page.goto("/conta/favoritos");
    await expect(page.getByText(title).first()).toBeVisible();

    await page.goto(LISBON);
    await page.locator("article").nth(0).getByRole("button", { name: "Adicionar ao comparador" }).click();
    await page.locator("article").nth(1).getByRole("button", { name: "Adicionar ao comparador" }).click();
    await page.getByRole("link", { name: "Comparar", exact: true }).click();
    await expect(page).toHaveURL(/\/comparar\?r=pr-\d{6},pr-\d{6}/);
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("columnheader")).toHaveCount(3);
  });

  test("save a search with an alert, then cancel it in one click from the email link", async ({ page, signedIn }) => {
    await page.goto(LISBON + "?t=2");
    await page.getByRole("button", { name: /Guardar pesquisa/ }).click();
    await page.getByRole("button", { name: "Guardar e ativar" }).click();
    await expect(page.getByText(/Pesquisa guardada/).first()).toBeVisible(); // wait for the server action before navigating away
    await page.goto("/conta/pesquisas");
    await expect(page.getByText(/em Lisboa/).first()).toBeVisible();
    // The one-click page: nothing happens on GET, a single button confirms.
    const { default: postgres } = await import("postgres");
    const sql = postgres(process.env.DATABASE_URL ?? "postgres://praca:praca@localhost:5432/praca", { max: 1 });
    const [a] = await sql<{ unsubscribe_token: string }[]>`SELECT unsubscribe_token FROM alerts WHERE user_id = ${signedIn.userId}`;
    await sql.end();
    await page.goto(`/alertas/cancelar/${a!.unsubscribe_token}`);
    await page.getByRole("button", { name: "Cancelar alerta" }).click();
    await expect(page.getByRole("heading", { name: "Alerta cancelado" })).toBeVisible();
  });

  test("free plan is limited to 3 alerts", async ({ page, signedIn }) => {
    void signedIn;
    for (let i = 0; i < 3; i++) {
      await page.goto(LISBON + `?t=${i + 1}`);
      await page.getByRole("button", { name: /Guardar pesquisa/ }).click();
      await page.getByRole("button", { name: "Guardar e ativar" }).click();
      await expect(page.getByText(/Pesquisa guardada/).first()).toBeVisible();
    }
    await page.goto(LISBON + "?t=4");
    await page.getByRole("button", { name: /Guardar pesquisa/ }).click();
    await page.getByRole("button", { name: "Guardar e ativar" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /limite de 3 alertas/ })).toBeVisible();
  });
});

test("drawn zones narrow the results (URL-shareable)", async ({ page, request }) => {
  const all = await (await page.request.get("/api/search?business=sale&count=1&m=1106")).json();
  // A small box around Alvalade/Areeiro in Lisbon.
  const zona = "-9.1500,38.7400;-9.1250,38.7400;-9.1250,38.7550;-9.1500,38.7550";
  const some = await (await request.get(`/api/search?business=sale&count=1&m=1106&zonas=${encodeURIComponent(zona)}`)).json();
  expect(some.total).toBeGreaterThan(0);
  expect(some.total).toBeLessThan(all.total);
  await page.goto(`/comprar/lisboa/lisboa?zonas=${encodeURIComponent(zona)}`);
  await expect(page.getByRole("button", { name: /Remover filtro Zona 1/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Desenhar zona" })).toBeVisible();
});

test.describe("market observatory", () => {
  test("zone page shows KPIs with their 'how it is calculated', charts and the heat map", async ({ page }) => {
    await page.goto("/mercado/lisboa/lisboa");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Mercado imobiliário em Lisboa");
    await expect(page.getByText("Preço mediano pedido").first()).toBeVisible();
    await page.getByText("Como é calculado").first().click();
    await expect(page.getByText(/pelo menos 10 anúncios/)).toBeVisible();
    await expect(page.getByRole("group", { name: "Mapa de calor do preço por m²" })).toBeVisible();
    await expect(page.locator('script[type="application/ld+json"]').first()).toHaveCount(1);
  });
  test("unknown zones are a real 404 and the index lists districts", async ({ page, request }) => {
    expect((await request.get("/mercado/nao-existe")).status()).toBe(404);
    await page.goto("/mercado");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Portugal");
  });
  test("area analytics are gated for free users", async ({ page, signedIn }) => {
    void signedIn;
    await page.goto("/mercado/analitica");
    await expect(page.getByRole("heading", { name: /nos planos Pro e Agência/ })).toBeVisible();
  });
});

test.describe("Pro: valuation, PDF and SmartLink", () => {
  test.use({ plan: "pro" });
  test("values a property, downloads the PDF, shares a SmartLink that works without login", async ({ page, signedIn, browser }) => {
    void signedIn;
    // A Lisbon apartment: the valuation form pre-fills from it (land parcels have no usable area).
    const list = await (await page.request.get("/api/search?business=sale&m=1106&tipo=apartment")).json();
    await page.goto(`/avaliar?ref=${list.items[0].reference}`);
    await page.getByRole("button", { name: /Calcular avaliação/ }).click();
    await expect(page).toHaveURL(/\/avaliar\/[0-9a-f-]{36}/);
    await expect(page.getByRole("heading", { name: "Relatório de avaliação" })).toBeVisible();
    await expect(page.getByText("Valor estimado")).toBeVisible();
    await expect(page.getByRole("table").first()).toBeVisible();

    const pdfHref = await page.getByRole("link", { name: "Descarregar PDF" }).getAttribute("href");
    const pdf = await page.request.get(pdfHref!);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toBe("application/pdf");
    expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

    await page.getByRole("button", { name: "Criar SmartLink" }).click();
    const url = await page.getByTestId("smartlink-url").innerText();
    const anon = await browser.newContext();
    const p2 = await anon.newPage();
    await p2.goto(url);
    await expect(p2.getByRole("heading", { name: "Relatório de avaliação" })).toBeVisible();
    await anon.close();
  });
});

test.describe("plans (mock checkout)", () => {
  test("starting the Pro trial activates the plan", async ({ page, signedIn }) => {
    void signedIn;
    await page.goto("/planos");
    await expect(page.getByText(/checkout é simulado/)).toBeVisible();
    await page.locator("section", { has: page.getByRole("heading", { name: "Pro", exact: true }) }).getByRole("button", { name: "Começar teste grátis" }).click();
    await expect(page).toHaveURL(/\/conta\?plano=ativo/);
    await expect(page.getByText(/teste grátis de 14 dias/i)).toBeVisible();
    await page.goto("/avaliar");
    await expect(page.getByRole("heading", { name: "Avaliar imóvel" })).toBeVisible();
  });
});

test.describe("Agency: team, CRM, API", () => {
  test.use({ plan: "agency" });
  test("pipeline: create a contact and a deal, move it, see the history", async ({ page, signedIn }) => {
    void signedIn;
    await page.goto("/crm/contactos");
    const form = page.getByRole("region", { name: "Novo contacto" });
    await form.getByLabel("Nome", { exact: true }).fill("Maria Compradora");
    await form.getByLabel("Email", { exact: true }).fill("maria@example.com");
    await form.getByRole("button", { name: "Guardar contacto" }).click();
    await expect(page.getByText("Contacto guardado.")).toBeVisible();

    await page.goto("/crm");
    await page.getByRole("button", { name: "Novo negócio" }).click();
    await page.getByLabel("Título").fill("T2 Alvalade para a Maria");
    await page.getByLabel("Contacto").selectOption({ label: "Maria Compradora" });
    await page.getByRole("button", { name: "Criar negócio" }).click();
    const card = page.locator("li", { hasText: "T2 Alvalade para a Maria" });
    await expect(card).toBeVisible();
    await card.getByRole("combobox").selectOption("visit");
    await expect(page.getByRole("listitem", { name: "Visita" }).getByRole("link", { name: "T2 Alvalade para a Maria" })).toBeVisible();
    await card.getByRole("link", { name: "T2 Alvalade para a Maria" }).click();
    await expect(page.getByText("deal.stage_changed")).toBeVisible();
  });

  test("CSV import and export of contacts", async ({ page, signedIn }) => {
    void signedIn;
    await page.goto("/crm/contactos");
    await page.locator("#imp").setInputFiles({ name: "contactos.csv", mimeType: "text/csv", buffer: Buffer.from("nome,email,telefone,tipo\nJoão Investidor,joao@example.com,910000000,investor\n,,,\n") });
    await page.getByRole("button", { name: "Importar", exact: true }).click();
    await expect(page.getByText(/1 importados, 1 ignorados/)).toBeVisible();
    const csv = await page.request.get("/api/crm/export?type=contacts");
    expect(csv.status()).toBe(200);
    expect(await csv.text()).toContain("João Investidor");
  });

  test("a free user is blocked from the CRM and its export", async ({ browser }) => {
    const ctx = await browser.newContext();
    const r = await ctx.request.get("http://localhost:3100/api/crm/export?type=contacts");
    expect([401, 403]).toContain(r.status());
    await ctx.close();
  });

  test("team page: brand settings and invitation", async ({ page, signedIn }) => {
    void signedIn;
    await page.goto("/equipa");
    await page.getByLabel("Cor da marca (#RRGGBB)").fill("#0A7A5A");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Guardado.")).toBeVisible();
    await page.getByLabel("Email do convite").fill("colega@example.com");
    await page.getByRole("button", { name: "Enviar convite" }).click();
    await expect(page.getByText("Convite enviado.")).toBeVisible();
    await expect(page.getByText("colega@example.com")).toBeVisible();
  });

  test("API key: create, call the API, revoke", async ({ page, request, signedIn }) => {
    void signedIn;
    await page.goto("/conta/api");
    await page.getByLabel("Nome da chave").fill("E2E");
    await page.getByRole("button", { name: "Criar chave" }).click();
    const secret = await page.getByTestId("api-secret").innerText();
    expect(secret).toMatch(/^prk_/);
    const ok = await request.get("/api/v1/properties?m=1106&limit=2", { headers: { authorization: `Bearer ${secret}` } });
    expect(ok.status()).toBe(200);
    expect((await ok.json()).data).toHaveLength(2);
    await page.getByRole("button", { name: "Revogar" }).click();
    await expect(page.getByText("Revogada")).toBeVisible();
    expect((await request.get("/api/v1/properties", { headers: { authorization: `Bearer ${secret}` } })).status()).toBe(401);
  });

  test("prospecting: private-owner listings can be added to the pipeline, with the legal notice", async ({ page, signedIn }) => {
    void signedIn;
    await page.goto("/crm/prospecao?m=1106");
    await expect(page.getByText("Atenção legal")).toBeVisible();
    await expect(page.getByTestId("approach-template")).toContainText("interesse legítimo");
    await page.getByRole("button", { name: "Adicionar à prospeção" }).first().click();
    await expect(page.getByText("Já na prospeção").first()).toBeVisible();
  });
});

test.describe("admin", () => {
  test("non-admins are redirected away", async ({ page, signedIn }) => {
    void signedIn;
    await page.goto("/admin");
    await expect(page).not.toHaveURL(/\/admin/);
  });
  test.describe("as admin", () => {
    test.use({ role: "admin" });
    test("overview, users, quotas and sources are available", async ({ page, signedIn }) => {
      void signedIn;
      await page.goto("/admin");
      await expect(page.getByRole("heading", { name: "Administração" })).toBeVisible();
      await expect(page.getByText("Anúncios ativos")).toBeVisible();
      await page.goto("/admin/planos");
      await expect(page.getByRole("heading", { name: "Quotas por plano" })).toBeVisible();
      await page.goto("/admin/fontes");
      await expect(page.getByText("Fontes que dependem de licença")).toBeVisible();
      await page.goto("/admin/imoveis?q=PR-000871");
      await expect(page.getByRole("link", { name: "PR-000871" })).toBeVisible();
    });
  });
});

test("developer docs and OpenAPI are public", async ({ page, request }) => {
  await page.goto("/developers");
  await expect(page.getByRole("heading", { name: "API da Praça" })).toBeVisible();
  await page.getByRole("tab", { name: "Python" }).first().click();
  await expect(page.getByText("import os, requests")).toBeVisible();
  const spec = await (await request.get("/api/v1/openapi.json")).json();
  expect(spec.openapi).toBe("3.1.0");
});

test("API without a key is a 401 in the standard error shape", async ({ request }) => {
  const r = await request.get("/api/v1/properties");
  expect(r.status()).toBe(401);
  expect((await r.json()).error.code).toBe("unauthorized");
});
