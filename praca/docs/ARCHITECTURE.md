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
