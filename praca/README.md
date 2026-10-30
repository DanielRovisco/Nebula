# Praça

Portal de inteligência imobiliária para Portugal: pesquisa lista + mapa, deduplicação de anúncios, histórico de preço e indicadores de mercado com fonte, data e amostra. *Cada imóvel, um registo limpo. Cada preço, uma prova.*

**Stack:** Next.js 15 · TypeScript estrito · Tailwind v4 · PostgreSQL + PostGIS · Drizzle · Auth.js v5 · next-intl (pt-PT / en) · MapLibre · Recharts · Vitest · Playwright.

> Os dados do `pnpm db:seed` são **sintéticos** (marcados `is_seed`) e há um banner "Dados de demonstração" fora de produção. A geografia (20 regiões, 308 concelhos, 3 259 freguesias) é real (CAOP/DGT).

## Arranque (clone limpo)

Requisitos: Node ≥ 20.11, pnpm 10, PostgreSQL 14+ com PostGIS (ou Docker).

```bash
cd praca
cp .env.example .env.local        # já funciona em local; AUTH_SECRET: openssl rand -base64 32
docker compose up -d db mailpit   # PostGIS em :5432, Mailpit em http://localhost:8025
pnpm install
pnpm db:migrate
pnpm db:seed                      # ~5 000 imóveis sintéticos, ~10 s
pnpm dev                          # http://localhost:3000
```

Login em desenvolvimento: peça a ligação em `/entrar`; chega ao Mailpit (ou aparece no terminal do servidor se não houver SMTP).

## Comandos

| Comando | O que faz |
| --- | --- |
| `pnpm dev` / `build` / `start` | Next.js |
| `pnpm typecheck` · `lint` · `test` | TypeScript · ESLint · Vitest (unitários + integração com a BD) |
| `pnpm test:e2e` | Playwright (fluxos das fases 1 a 3: pesquisa, zonas, alertas, favoritos, observatório, avaliação+PDF, planos, CRM, API, admin, calculadoras, pesquisa natural, blog/newsletter, projetos, PWA, MCP, dossiê, selo; mais `a11y.spec.ts` com axe em claro/escuro). `PW_CHROMIUM_PATH=/caminho/chromium` se o browser não for o da versão instalada |
| `pnpm alerts:run [instant\|daily\|weekly]` | Corre o motor de alertas e envia os resumos (útil em desenvolvimento) |
| `pnpm db:generate` | Gera migração a partir do esquema Drizzle |
| `pnpm db:migrate` · `db:seed` · `db:reset` | Migrar (cria extensões) · semear · apagar o esquema |
| `pnpm geo:fetch` | Regenera `data/geo/*` a partir da origem aberta |
| `pnpm risk:import --file … --code …` | Importa uma camada de risco oficial em GeoJSON (ver [`docs/RISK_LAYERS.md`](docs/RISK_LAYERS.md)) |

`SEED_PROPERTIES=2000 pnpm db:seed` muda o volume do seed.

## Estado

**Fase 1 — Fundação ✅** design system claro/escuro, i18n pt-PT/en, PostGIS + migrações, geografia PT, seed, home, pesquisa lista+mapa (30+ filtros), página de imóvel, auth, conta/RGPD, cookies, SEO.

**Fase 2 — Núcleo de negócio ✅**
- **Pesquisa:** zonas livres e múltiplas (URL partilhável, guardáveis), favoritos com pastas e notas, comparador (até 4), histórico de vistos, pesquisas guardadas e alertas instantâneo/diário/semanal (React Email, cancelamento num clique).
- **Mercado:** observatório `/mercado/…` (distrito → concelho → freguesia) com KPIs que mostram fonte, data e amostra, mapa de calor, séries, distribuição, tipologias e regra n ≥ 10; analítica Pro (comparar zonas, correlação, CSV).
- **Pro/Agência:** avaliação AVM/CMA com comparáveis ajustados, relatório PDF com a marca, SmartLink atualizado; prospeção de particulares (FSBO) com modelo RGPD; CRM (kanban, contactos, tarefas, notas, CSV, webhooks assinados); equipas com papéis, convites e auditoria; partilha de comissões; planos com Stripe (Checkout, Portal, webhook assinado, trial 14 dias) e quotas.
- **Dados e plataforma:** ingestão CSV/JSON/XML Kyero e feeds com credenciais, normalização, geocoding, deduplicação (fundir/rever), painel de administração (imóveis, utilizadores/AMI, quotas, moderação, duplicados, fontes, execuções), API v1 com chaves, quotas e OpenAPI 3.1, página `/developers`.

**Fase 3 — Diferenciação ✅**
- **Pesquisa em linguagem natural** (`/` → «Ou descreva o que procura»): interpretador por regras, pt e en, que mostra como entendeu a frase e diz o que ainda não filtra (ex.: «perto do metro»).
- **Preço justo** na página do imóvel: o AVM contra imóveis semelhantes, sem contar o próprio anúncio; só aparece com ≥ 8 comparáveis e confiança média ou alta.
- **Mapa do imóvel:** camadas de risco (importador `pnpm risk:import`) e isócronas a pé, de bicicleta e de carro (openrouteservice com `ORS_API_KEY`; sem chave, círculo aproximado e assinalado).
- **Calculadoras** `/calculadoras`: IMT (HPP, secundária, outros, IMT Jovem), selo, prestação e esforço, mais-valias, rendimento de arrendamento e capacidade de crédito. Tabelas fiscais na base de dados, com fonte e estado «por confirmar».
- **Alertas por push (Web Push) e WhatsApp (Cloud API, com verificação por código)**, além do email; **PWA** instalável com página offline e favoritos/pesquisas guardadas offline.
- **Projetos novos** `/projetos` (pipeline por fase + ficha com frações), **blog** `/blog` e **newsletter** com dupla confirmação e envio semanal idempotente, **dossiê PDF** de cada imóvel.
- **Antifraude** (sinais explicáveis, quarentena para moderação) e **selo «verificado» com prova registada** (quem, como e quando).
- **Servidor MCP** `/api/mcp` (leitura) e auditoria de acessibilidade/desempenho — ver [`docs/QUALITY.md`](docs/QUALITY.md).

## Documentação

[`ARCHITECTURE`](docs/ARCHITECTURE.md) · [`DECISIONS`](docs/DECISIONS.md) · [`METHODOLOGY`](docs/METHODOLOGY.md) · [`DATA_SOURCES`](docs/DATA_SOURCES.md) · [`FISCAL`](docs/FISCAL.md) · [`LEGAL_CHECKLIST`](docs/LEGAL_CHECKLIST.md) · [`RISK_LAYERS`](docs/RISK_LAYERS.md) · [`QUALITY`](docs/QUALITY.md) · [`DEPLOY`](docs/DEPLOY.md) (inclui checklist de go-live)

## Nota sobre o repositório

Este projeto vive em `praca/` porque a raiz do repositório é o site da NEBULA (Vite/GitHub Pages), que não foi tocado. O CI do portal (`.github/workflows/praca-ci.yml`) só corre quando `praca/**` muda.
