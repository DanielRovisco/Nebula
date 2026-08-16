# Arranque — o que falta fazer

Tudo o que se podia automatizar já está automatizado. O que sobra é o que exige
as **vossas contas, o vosso cartão e a vossa identidade** — coisas que ninguém
pode fazer por vocês, e que eu não devia fazer nem que pudesse.

São **seis passos manuais**. O resto corre em dois comandos.

---

## Antes de começar

```bash
npm install
```

## 1. Domínio  *(manual — ~10 min)*

1. **Comprar** `nebula.pt` num registrar (Amen, PTisp, Cloudflare Registrar).
   ~15 €/ano.
2. Na zona DNS do domínio:
   - 4 registos `A`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
     `185.199.111.153`
   - `CNAME` de `www` → `danielrovisco.github.io`
3. GitHub → Settings → Pages → Custom domain → escrever o domínio → esperar a
   verificação → ligar **Enforce HTTPS**.
4. No repositório, editar `site.config.json`:
   ```json
   { "origin": "https://nebula.pt", "base": "/" }
   ```
   e correr `npm run build`.

   **É só isto.** O `base` do Vite, o `basename` do router, os canonical, as
   hreflang, o sitemap, o robots, o manifest, o JSON-LD do negócio e o ficheiro
   `CNAME` saem todos daí. Já testei a troca ponta a ponta: com
   `nebula.pt` + `/`, as doze páginas saem com os endereços certos e o `CNAME`
   aparece sozinho no `dist`.

## 2. Email profissional  *(manual — ~15 min)*

Caixa no domínio (`geral@nebula.pt`). O Zoho Mail tem plano gratuito para um
domínio. Depois é mudar `CONTACT.email` em `src/lib/site.ts` — uma linha.

Sem domínio verificado não vale a pena tentar emails automáticos: vão para spam.

## 3. Supabase  *(manual — ~10 min)*

1. Criar projeto em supabase.com, **numa região da União Europeia** (Frankfurt
   ou Londres) — os dados são de clientes portugueses.
2. Authentication → Users → **Add user** com email e password, marcado como
   confirmado. É este o login de `/admin`.
3. Authentication → Providers → Email → **desligar _Enable sign ups_**.
   Sem isto, qualquer pessoa se regista e entra no painel. Não saltar.
4. Guardar de Project Settings → API: o **Project URL** e a chave **anon**.
   E de Project Settings → Database: a **connection string** (URI).

## 4. Cloudflare R2  *(manual — ~10 min)*

1. Criar conta, ativar o R2 (pede cartão, não cobra dentro dos 10 GB).
2. Bucket **privado** `galleries` — sem acesso público.
3. Bucket **público** `nebula-site` — ativar *Public access* e copiar o URL.
4. R2 → Manage API Tokens → Object Read & Write. Guardar **Access Key ID**,
   **Secret** e o **Account ID**.
5. No bucket privado, Settings → CORS policy → colar o conteúdo de
   [`supabase/r2-cors.json`](supabase/r2-cors.json) (já está escrito, e já tem o
   domínio certo).

## 5. Ligar tudo  *(automático — 1 comando)*

```bash
npm i -g supabase && supabase login && supabase link
npm run setup
```

O `npm run setup` pergunta pelas chaves dos passos 3 e 4 e trata do resto:

- escreve o `.env.local`
- corre o `supabase/schema.sql` na base de dados (se deres a connection string)
- guarda os secrets do R2 no Supabase
- publica as quatro Edge Functions, cada uma com a verificação de JWT que lhe
  compete
- mostra a política de CORS pronta a colar

Pode ser repetido sem medo: o schema é idempotente e nada é apagado.

Para confirmar que ficou tudo de pé:

```bash
ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run setup:check
```

Faz login a sério, pede um upload assinado, escreve mesmo no R2 e apaga o
ficheiro de teste.

## 6. GitHub  *(manual — ~5 min)*

Settings → Secrets and variables → Actions → New repository secret:

| Secret | Valor |
|---|---|
| `VITE_SUPABASE_URL` | Project URL do Supabase |
| `VITE_SUPABASE_ANON_KEY` | chave anon |
| `VITE_R2_PUBLIC_URL` | URL público do bucket do site |
| `VITE_CONTACT_ENDPOINT` | endpoint do Formspree (passo 7) |
| `VITE_ANALYTICS_SRC` | script de estatísticas (passo 8) |
| `VITE_ANALYTICS_DOMAIN` **ou** `VITE_ANALYTICS_ID` | conforme a ferramenta |

Depois disto, **diz-me** e eu tiro o modo de demonstração do workflow de deploy.
Não o faço antes: sem os secrets, o site publicado ficava com um painel que não
abre e galerias que não funcionam.

## 7. Formulário  *(manual — ~5 min)*

Conta no [Formspree](https://formspree.io), criar um form, copiar o endpoint
para o secret `VITE_CONTACT_ENDPOINT`. Sem isto o formulário abre o programa de
email do visitante — funciona, mas perde quem não tem email no telemóvel.

Com o domínio já verificado, ativar no painel deles a **Autoresponse** — é a
resposta automática ao cliente, sem código nenhum do nosso lado.

## 8. Estatísticas  *(manual — ~5 min)*

[Plausible](https://plausible.io) (~9 €/mês) ou [Umami](https://umami.is) (tem
plano gratuito). Copiar o script para os secrets do passo 6. **Só ferramentas
sem cookies** — é o que dispensa o aviso de cookies e mantém a política de
privacidade como está.

---

## O que só vocês podem dar

- **Dados da entidade** para a política de privacidade: nome fiscal, NIF e
  morada. Está marcado com um comentário em `src/pages/Privacy.tsx`. O RGPD
  obriga, e vale um advogado dar uma vista de olhos.
- **Testemunhos reais**, com autorização de quem os escreveu (Painel → Site).
- **Retratos da equipa** — são fotógrafos e não há uma cara no site.
- **Showreel** — 30 a 40 segundos. Continua a ser a maior subida possível.
- **Preços e FAQ**, se decidirem avançar.

## Depois de estar no ar

- Google Search Console: verificar o domínio e submeter o `sitemap.xml`.
- Google Business Profile: é o que aparece a quem procura no telemóvel.
- Uma galeria a sério de ponta a ponta: criar, carregar, publicar, entregar o
  link e ver o registo de atividade a responder.
