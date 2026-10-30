import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CodeTabs, type Snippet } from "@/components/developers/code-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { siteUrl } from "@/lib/env";
import { buildOpenApi } from "@/lib/openapi";

export const metadata: Metadata = { title: "API para programadores" };

const base = `${siteUrl}/api/v1`;

const snip = (curl: string, js: string, py: string): Snippet[] => [
  { lang: "curl", label: "curl", code: curl },
  { lang: "js", label: "JavaScript", code: js },
  { lang: "py", label: "Python", code: py },
];

const EXAMPLES: Record<string, { title: string; method: "GET" | "POST"; path: string; snippets: Snippet[] }> = {
  properties: {
    title: "Pesquisar imóveis",
    method: "GET",
    path: "/properties",
    snippets: snip(
      `curl "${base}/properties?m=1111&tipo=apartment&t=2,3&pmax=350000&ordem=price_asc&limit=10" \\\n  -H "Authorization: Bearer $PRACA_API_KEY"`,
      `const res = await fetch("${base}/properties?m=1111&tipo=apartment&t=2,3&pmax=350000&limit=10", {\n  headers: { Authorization: \`Bearer \${process.env.PRACA_API_KEY}\` },\n});\nconst { data, meta } = await res.json();\n// meta.nextCursor → pedir a página seguinte com &cursor=…`,
      `import os, requests\n\nr = requests.get(\n    "${base}/properties",\n    params={"m": "1111", "tipo": "apartment", "t": "2,3", "pmax": 350000, "limit": 10},\n    headers={"Authorization": f"Bearer {os.environ['PRACA_API_KEY']}"},\n    timeout=30,\n)\nr.raise_for_status()\nbody = r.json()`,
    ),
  },
  property: {
    title: "Detalhe de um imóvel",
    method: "GET",
    path: "/properties/{id}",
    snippets: snip(
      `curl "${base}/properties/PR-000871" -H "Authorization: Bearer $PRACA_API_KEY"`,
      `const { data } = await (await fetch("${base}/properties/PR-000871", {\n  headers: { Authorization: \`Bearer \${process.env.PRACA_API_KEY}\` },\n})).json();`,
      `r = requests.get("${base}/properties/PR-000871", headers=headers, timeout=30)\nprint(r.json()["data"]["priceHistory"])`,
    ),
  },
  valuations: {
    title: "Avaliar um imóvel",
    method: "POST",
    path: "/valuations",
    snippets: snip(
      `curl -X POST "${base}/valuations" \\\n  -H "Authorization: Bearer $PRACA_API_KEY" -H "Content-Type: application/json" \\\n  -d '{"lat":38.7369,"lng":-9.1427,"type":"apartment","typology":2,"area":80,"yearBuilt":2005,"condition":"used","floor":3,"elevator":true}'`,
      `const res = await fetch("${base}/valuations", {\n  method: "POST",\n  headers: { Authorization: \`Bearer \${process.env.PRACA_API_KEY}\`, "Content-Type": "application/json" },\n  body: JSON.stringify({ lat: 38.7369, lng: -9.1427, type: "apartment", typology: 2, area: 80 }),\n});\nconst { data } = await res.json(); // data.estimate.value, .low, .high, .confidence`,
      `r = requests.post("${base}/valuations", headers=headers, timeout=60,\n                  json={"lat": 38.7369, "lng": -9.1427, "type": "apartment", "typology": 2, "area": 80})\nprint(r.json()["data"]["estimate"]["value"])`,
    ),
  },
  market: {
    title: "Indicadores de mercado",
    method: "GET",
    path: "/market/{geoId}",
    snippets: snip(
      `curl "${base}/market/1111?months=24" -H "Authorization: Bearer $PRACA_API_KEY"`,
      `const { data } = await (await fetch("${base}/market/1111?months=24", { headers })).json();\nconsole.log(data.sale.medianPricePerM2, data.sale.sample);`,
      `r = requests.get("${base}/market/1111", params={"months": 24}, headers=headers, timeout=30)\nprint(r.json()["data"]["sale"])`,
    ),
  },
  alerts: {
    title: "Criar um alerta",
    method: "POST",
    path: "/alerts",
    snippets: snip(
      `curl -X POST "${base}/alerts" -H "Authorization: Bearer $PRACA_API_KEY" -H "Content-Type: application/json" \\\n  -d '{"name":"T2 em Sintra até 300 mil","filters":"tipo=apartment&t=2&pmax=300000&m=1111","frequency":"daily"}'`,
      `await fetch("${base}/alerts", {\n  method: "POST",\n  headers: { ...headers, "Content-Type": "application/json" },\n  body: JSON.stringify({ name: "T2 em Sintra", filters: "tipo=apartment&t=2&pmax=300000&m=1111", frequency: "daily" }),\n});`,
      `requests.post("${base}/alerts", headers=headers, timeout=30,\n              json={"name": "T2 em Sintra", "filters": "tipo=apartment&t=2&pmax=300000&m=1111", "frequency": "daily"})`,
    ),
  },
  developments: {
    title: "Novos projetos",
    method: "GET",
    path: "/developments",
    snippets: snip(
      `curl "${base}/developments?phase=selling&limit=10" -H "Authorization: Bearer $PRACA_API_KEY"`,
      `const { data } = await (await fetch("${base}/developments?phase=selling", { headers })).json();`,
      `r = requests.get("${base}/developments", params={"phase": "selling"}, headers=headers, timeout=30)`,
    ),
  },
};

export default async function DevelopersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("developers");
  const spec = buildOpenApi();
  const errors = spec.components.schemas.Error.properties.error.properties.code.enum;
  return (
    <div className="mx-auto max-w-4xl space-y-14 px-4 pb-24 pt-12 sm:px-6">
      <header>
        <h1 className="font-display text-4xl font-medium sm:text-5xl">{t("title")}</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted">{t("sub")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild><Link href="/conta/api">{t("getKey")}</Link></Button>
          <Button asChild variant="secondary"><a href="/api/v1/openapi.json">{t("openapi")}</a></Button>
        </div>
      </header>

      <section aria-labelledby="auth" className="space-y-3">
        <h2 id="auth" className="text-2xl font-semibold">{t("authTitle")}</h2>
        <p className="text-muted">{t("authText")}</p>
        <pre className="overflow-x-auto rounded-[14px] border border-border bg-surface-2 p-4 text-[13px]"><code>{`Authorization: Bearer prk_xxxxxxxxxxxxxxxx`}</code></pre>
        <p className="text-sm text-muted">{t("quotaText")}</p>
      </section>

      <section aria-labelledby="conv" className="space-y-3">
        <h2 id="conv" className="text-2xl font-semibold">{t("convTitle")}</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-muted">
          <li>{t("convEnvelope")}</li>
          <li>{t("convPaging")}</li>
          <li>{t("convDemo")}</li>
        </ul>
        <h3 className="pt-2 text-lg font-semibold">{t("errorsTitle")}</h3>
        <pre className="overflow-x-auto rounded-[14px] border border-border bg-surface-2 p-4 text-[13px]"><code>{`HTTP 429\n{ "error": { "code": "quota_exceeded", "message": "Atingiu o limite mensal de 10000 chamadas." } }`}</code></pre>
        <p className="flex flex-wrap gap-1.5">{errors.map((c) => <Badge key={c} tone="outline"><code>{c}</code></Badge>)}</p>
      </section>

      {Object.entries(EXAMPLES).map(([key, ex]) => (
        <section key={key} aria-labelledby={`ep-${key}`} className="space-y-3">
          <h2 id={`ep-${key}`} className="flex flex-wrap items-center gap-3 text-2xl font-semibold">
            {ex.title}
            <span className="flex items-center gap-2 text-sm font-normal"><Badge tone={ex.method === "GET" ? "up" : "brand"}>{ex.method}</Badge><code className="text-muted">/api/v1{ex.path}</code></span>
          </h2>
          <CodeTabs snippets={ex.snippets} />
        </section>
      ))}

      <section aria-labelledby="mcp" className="rounded-[20px] border border-border bg-surface p-6">
        <h2 id="mcp" className="text-xl font-semibold">{t("mcpTitle")}</h2>
        <p className="mt-2 text-muted">{t("mcpText")}</p>
      </section>
    </div>
  );
}
