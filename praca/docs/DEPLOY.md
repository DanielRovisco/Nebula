# Deploy passo a passo (Vercel + Supabase/Neon + R2)

Tempo estimado: ~15 min. Fase 1 só precisa dos passos 1, 5, 6 e 8; os restantes ficam preparados para as Fases 2–3.

## 1. Base de dados
1. Criar projeto no **Supabase** ou **Neon** (região UE, ex. `eu-west`/`eu-central`).
2. Ativar extensões: `postgis`, `pg_trgm`, `unaccent` (Supabase: *Database → Extensions*; Neon: `CREATE EXTENSION`). O `pnpm db:migrate` também as cria se o utilizador tiver permissões.
3. Obter duas strings: **pooled** (`DATABASE_URL`, PgBouncer) e **direta** (`DATABASE_URL_UNPOOLED`, usada pelas migrações).
4. Localmente (ou num job de CI) com essas variáveis:
   ```bash
   pnpm db:migrate
   pnpm db:seed        # só em staging/demo; NÃO em produção real
   ```
   Em produção real carregue só a geografia: o seed já a inclui, por isso corra `pnpm db:seed` uma vez com `SEED_PROPERTIES=0` e depois remova os dados de demonstração (`DELETE FROM listings WHERE is_seed; DELETE FROM properties WHERE is_seed;`).

## 2. Media (Cloudflare R2 ou Supabase Storage)
1. Criar o bucket `praca-media`, acesso público de leitura via domínio próprio (`media.o-seu-dominio.pt`).
2. CORS: `GET, HEAD` para `https://o-seu-dominio.pt`.
3. Definir `MEDIA_BASE_URL` e as chaves `R2_*`. Adicionar o domínio a `images.remotePatterns` em `next.config.ts`.

## 3. Stripe (Fase 2)
Criar produtos Pro (mensal/anual) e Agência (por lugar), preços com trial de 14 dias, webhook `https://o-seu-dominio.pt/api/stripe/webhook` (eventos de checkout e subscription) e `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`. Testar em modo teste antes do live.

## 4. Resend
1. Adicionar o domínio, publicar os registos **SPF**, **DKIM** e **DMARC** (`v=DMARC1; p=quarantine; rua=mailto:dmarc@o-seu-dominio.pt`).
2. `RESEND_API_KEY` e `EMAIL_FROM="Praça <ola@o-seu-dominio.pt>"`.

## 5. Vercel
1. *Import Project* → escolher o repositório, **Root Directory = `praca`**, framework Next.js, instalar com pnpm.
2. Variáveis (Production e Preview): ver `.env.example`. Obrigatórias: `DATABASE_URL`, `AUTH_SECRET` (`openssl rand -base64 32`), `AUTH_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_ENV=production`, `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_ENTITY_*`. Opcionais: Google OAuth, MapTiler, Upstash, Turnstile.
3. Deploy de *preview* (`NEXT_PUBLIC_APP_ENV=staging`, mostra o banner de demonstração e `noindex`) e depois produção.

## 6. Domínio
Adicionar `o-seu-dominio.pt` e `www` na Vercel, HTTPS automático, redirecionar `www` → apex, `AUTH_URL` e `NEXT_PUBLIC_SITE_URL` com o apex. Verificar `/robots.txt` (em `production` permite indexação) e submeter `/sitemap.xml` no Google Search Console.

## 7. Jobs, erros e analítica
- **Crons** (Fase 2): `vercel.json` com crons para `/api/cron/indicators` (diário), alertas (instantâneo via fila, diário, semanal) e newsletter (semanal). Alternativa: Inngest.
- **Sentry**: `SENTRY_DSN` e `@sentry/nextjs`.
- **Analítica**: Vercel Analytics ou Plausible, carregada só com consentimento (`praca.consent.v1`).
- Healthcheck: `GET /api/health` (200 com BD e PostGIS a responder; 503 caso contrário).

## 8. Checklist de go-live
- [ ] `NEXT_PUBLIC_APP_ENV=production`; `/robots.txt` permite indexação; sem banner de demonstração
- [ ] Sem dados `is_seed` em produção (`SELECT count(*) FROM listings WHERE is_seed` = 0)
- [ ] Tabelas fiscais verificadas (`verified_at` preenchido) — `docs/FISCAL.md`
- [ ] Textos legais revistos por advogado, entidade/AMI/NIF preenchidos — `docs/LEGAL_CHECKLIST.md`
- [ ] Livro de Reclamações Eletrónico registado
- [ ] SPF/DKIM/DMARC válidos; email de login recebido na caixa de entrada
- [ ] **Backups**: PITR ativo (Supabase Pro / Neon), teste de restauro feito
- [ ] **Monitorização**: Sentry, alertas de uptime em `/api/health`, alerta de erros 5xx
- [ ] Upstash configurado (rate limit multi-instância); Turnstile ativo nos formulários públicos
- [ ] `pnpm test:e2e` verde contra o ambiente de preview
- [ ] Lighthouse mobile ≥ 90 (desempenho) e ≥ 95 (acessibilidade/boas práticas/SEO) em home, pesquisa, imóvel
- [ ] **Rollback**: Vercel → *Deployments → Promote previous*; migrações só *forward-compatible* (adicionar antes de remover); backup antes de cada migração destrutiva

## Notas da fase 2

- **Variáveis novas:** `ADMIN_EMAILS` (primeiros administradores), `CRON_SECRET`, `STRIPE_PRICE_{PRO,AGENCY}_{MONTH,YEAR}`, `GEOCODER`/`GEOCODER_USER_AGENT`. `STRIPE_MOCK` só em desenvolvimento.
- **Crons (`vercel.json`):** alertas (`?freq=instant` de 15 em 15 min, `daily` 07:00, `weekly` 2.ª 07:00), indicadores (03:00) e ingestão (15 min). Na Vercel Hobby os crons só correm 1×/dia: use o plano Pro ou o Inngest/GitHub Actions a chamar estes URLs com `Authorization: Bearer $CRON_SECRET`.
- **Stripe (passo 3 em detalhe):** criar os produtos Pro e Agência (Agência com preço por unidade), preços mensal/anual em EUR com IVA incluído, copiar os `price_…` para as variáveis, criar o webhook `https://o-seu-dominio.pt/api/stripe/webhook` com `checkout.session.completed` e `customer.subscription.created/updated/deleted`, ativar o Customer Portal. Testar com `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
- **Após o primeiro deploy:** iniciar sessão com um email de `ADMIN_EMAILS`, abrir `/admin/planos` e confirmar as quotas; `/admin/fontes` para criar a primeira fonte real (com licença).
- **Produção real:** não correr o seed de imóveis (ver passo 1). Definir `UPSTASH_*` para o rate limit.
