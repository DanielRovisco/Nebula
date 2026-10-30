# Arquitetura

```
Browser ──► Next.js 15 (App Router, RSC) ──► PostgreSQL + PostGIS
              │  server actions (auth, contacto, conta)
              │  /api/* (search, map, suggest, health, img, consent, export)
              └► Resend / SMTP (emails)         MapLibre ◄── OpenFreeMap | MapTiler
```

## Camadas

| Pasta | Responsabilidade |
| --- | --- |
| `src/app/[locale]` | Páginas (RSC). Home, pesquisa (`comprar`/`arrendar`), `imovel/[ref]`, auth, conta, institucionais |
| `src/app/api` | Rotas JSON: `search`, `search/map`, `geo/suggest`, `listing/[id]/card`, `health`, `consent`, `account/export`, `img/seed` |
| `src/components` | UI (`ui/` primitivas), `layout/`, `home/`, `search/`, `property/`, `auth/` |
| `src/server` | Acesso a dados e regras (nunca importado por componentes cliente, exceto tipos): `search`, `geo`, `properties`, `market`, `indicators`, `fiscal`, `inquiry`, `account`, `email`, `rate-limit` |
| `src/lib` | Código puro e testado: filtros e URL, dedupe, estimativa, cálculos fiscais, formatação pt-PT |
| `src/db` | Esquema Drizzle (`schema/*`), `bootstrap.sql`, clientes |
| `drizzle/` | Migrações versionadas (0000 gerada, 0001 PostGIS à mão) |
| `scripts/` | `migrate`, `seed` (+ `seed/`), `fetch-geo`, `reset` |
| `messages/` | Catálogos pt / en (testados para paridade de chaves) |

## Pesquisa

1. `parseFilters` (Zod/validação defensiva) transforma a query string em `SearchFilters`; valores inválidos são descartados.
2. `buildConditions` gera condições SQL parametrizadas, partilhadas por lista, contagem e mapa.
3. A lista usa `ORDER BY (expr, id)` com *keyset*; índices parciais `listings_search_*` cobrem `status='active' AND is_primary`.
4. O mapa recebe pontos compactos (`/api/search/map`, até 6 000) e agrupa no cliente (GeoJSON cluster).
5. A bounding box usa `ST_MakePoint(lng,lat) && ST_MakeEnvelope(...)`, servida pelo índice GiST `properties_geom_gist`.

## Dados

`properties` ← `listings` (N por fonte) ← `listing_price_history` / `listing_events` / `listing_media`. `market_indicators` guarda o snapshot mensal por geografia com a regra n ≥ 10 (senão agrega ao nível acima e regista `aggregated_from`). Ver `METHODOLOGY.md`.

## Segurança

Headers (HSTS, nosniff, frame, referrer, permissions) em `next.config.ts`; validação em todas as fronteiras; queries parametrizadas; honeypot + rate limit nos formulários; sessões em BD; resposta do login não revela se o email existe; exportação e eliminação de conta (RGPD).

## Fase 2

```
Pesquisa ─ zonas ─ guardar ─► saved_searches/alerts ─► motor de alertas ─► email (React Email) / cron
Ingestão (CSV/JSON/Kyero/feeds) ─► normalizar ─► geocoding ─► dedupe ─► properties/listings/eventos ─┘
properties/listings ─► indicadores mensais ─► /mercado (KPIs, mapa de calor, séries, analítica Pro, CSV)
properties/listings ─► AVM (comparáveis ajustados) ─► valuations ─► relatório · PDF · SmartLink
users/organizations/memberships ─► CRM (negócios, contactos, tarefas, partilhas, webhooks, prospeção FSBO)
subscriptions ─► entitlements/usage_counters ─► quotas (alertas, avaliações, PDF, CSV, API)
api_keys ─► /api/v1 (properties, valuations, market, alerts, developments) + OpenAPI
```

| Pasta | Fase 2 |
| --- | --- |
| `src/ingestion/` | `adapters/` (csv, json, kyero, stubs), `normalize`, `geocode`, `dedupe-db`, `pipeline`, `feeds`, `crypto` |
| `src/lib/avm/` | Modelo puro (similaridade, ajustes, quantis ponderados) com testes |
| `src/server/` | `alerts`, `saved-searches`, `favorites`, `zones`, `observatory`, `avm`, `valuations`, `valuation-data`, `pdf/`, `entitlements`, `billing`, `checkout`, `crm*`, `team`, `shares`, `prospects`, `webhooks`, `admin`, `api/` |
| `src/app/[locale]/` | `mercado`, `avaliar`, `s/[slug]`, `planos`, `equipa`, `crm/*`, `admin/*`, `comparar`, `conta/*`, `developers`, `alertas/cancelar` |
| `src/app/api/` | `v1/*`, `cron/{alerts,indicators,ingest}`, `stripe/webhook`, `crm/export`, `market/export`, `valuations/[id]/pdf` |

**Fronteira de segurança.** Server actions e rotas validam com Zod, resolvem o utilizador/organização pela sessão e nunca confiam em ids do cliente. O CRM filtra sempre por `organization_id`; a API por chave; os crons por `CRON_SECRET`; o webhook do Stripe pela assinatura sobre o corpo bruto.
