# Arranque — o que falta fazer

Lista completa e por ordem do que tem de ser feito **fora do código** para o
site sair do modo de demonstração e passar a funcionar a sério. O README explica
o *porquê* de cada peça; isto é a lista de tarefas.

Cada passo diz se depende de outro. Os que estão marcados **(eu)** são meus,
depois de teres feito a tua parte — pede-mos e eu trato.

---

## 0. Antes de tudo: o domínio

Sem domínio próprio há três coisas que ficam bloqueadas: os emails automáticos
(vão para spam), o `robots.txt` (num project site do GitHub Pages os crawlers
leem o da raiz do domínio, que não controlamos) e a credibilidade do endereço.

1. **Comprar o domínio.** `nebula.pt` ou equivalente. Registrar português
   (Amen, PTisp, Dominios.pt) ou Cloudflare Registrar. ~15 €/ano.
2. **Apontar o DNS ao GitHub Pages.** Na zona DNS do domínio:
   - 4 registos `A` para `185.199.108.153`, `185.199.109.153`,
     `185.199.110.153`, `185.199.111.153`
   - um `CNAME` de `www` para `danielrovisco.github.io`
3. **No GitHub:** Settings → Pages → Custom domain → escrever o domínio →
   esperar a verificação → ativar **Enforce HTTPS**.
4. **(eu)** Mudar `SITE_URL`, o `base` do Vite, o `basename` do router, o
   `sitemap.xml`, o `CNAME` em `public/` e o JSON-LD do `index.html`.

## 1. Email profissional

5. **Caixa de correio no domínio** — `geral@nebula.pt`. Zoho Mail tem plano
   gratuito para um domínio; o Google Workspace são ~6 €/utilizador/mês.
6. **(eu)** Trocar o endereço em `src/lib/site.ts` (está lá o Gmail).

## 2. Supabase (base de dados, login do painel, funções)

7. **Criar o projeto** em supabase.com. **Escolher uma região da União
   Europeia** (Frankfurt ou Londres) — os dados são de clientes portugueses e
   isso simplifica tudo do lado do RGPD.
8. **Correr o schema.** SQL Editor → New query → colar o conteúdo de
   `supabase/schema.sql` inteiro → Run. Cria as tabelas, as políticas de
   segurança, as funções de password e os tipos de evento.
   *É seguro voltar a correr:* o ficheiro é idempotente, e foi testado a correr
   duas vezes seguidas contra um PostgreSQL real.
9. **Criar o utilizador do painel.** Authentication → Users → Add user, com
   email e password, e marcar como confirmado. É este o login de `/admin`.
10. **Fechar o registo público.** Authentication → Providers → Email →
    desligar *Enable sign ups*. Sem isto, qualquer pessoa se pode registar e
    entrar no painel. **Não saltar este passo.**
11. **Copiar as chaves.** Project Settings → API:
    - `Project URL` e `anon public` → vão para o site (podem ser públicas)
    - `service_role` → **nunca** vai para o site; só para os secrets das funções

## 3. Cloudflare R2 (onde vivem as fotografias)

12. **Criar conta** na Cloudflare e ativar o R2 (pede cartão, não cobra dentro
    dos 10 GB gratuitos).
13. **Bucket privado** para as galerias: `galleries`. Sem acesso público, sem
    domínio ligado.
14. **CORS do bucket privado** — sem isto o browser recusa os uploads. Settings
    → CORS policy:
    ```json
    [{
      "AllowedOrigins": ["https://nebula.pt", "https://danielrovisco.github.io", "http://localhost:5173"],
      "AllowedMethods": ["PUT", "GET"],
      "AllowedHeaders": ["content-type"],
      "MaxAgeSeconds": 3600
    }]
    ```
15. **Bucket público** para as imagens do site: `nebula-site`. Ativar *Public
    access* e copiar o URL público (r2.dev ou subdomínio próprio).
16. **Token de API.** R2 → Manage API Tokens → Object Read & Write nesses
    buckets. Guardar o *Access Key ID* e o *Secret*. Anotar também o
    *Account ID* (barra lateral do R2).

## 4. Ligar o Supabase ao R2

Precisa do CLI: `npm i -g supabase && supabase login && supabase link`.

17. **Secrets das funções:**
    ```bash
    supabase secrets set \
      R2_ACCOUNT_ID=... \
      R2_ACCESS_KEY_ID=... \
      R2_SECRET_ACCESS_KEY=... \
      R2_BUCKET=galleries \
      R2_PUBLIC_BUCKET=nebula-site
    ```
18. **Publicar as quatro funções:**
    ```bash
    supabase functions deploy gallery-access   --no-verify-jwt
    supabase functions deploy gallery-log      --no-verify-jwt
    supabase functions deploy gallery-favorite --no-verify-jwt
    supabase functions deploy admin-storage
    ```
    As três primeiras levam `--no-verify-jwt` porque quem as chama é o cliente,
    que é anónimo — quem autoriza é a password da galeria, validada lá dentro.
    A última fica **com** verificação, porque só o admin autenticado lhe chama.

## 5. GitHub

19. **Secrets do repositório** (Settings → Secrets and variables → Actions):
    - `VITE_SUPABASE_URL`
    - `VITE_SUPABASE_ANON_KEY`
    - `VITE_R2_PUBLIC_URL` (o URL público do bucket do site)
    - `VITE_CONTACT_ENDPOINT` (passo 22)
    - `VITE_ANALYTICS_SRC`, `VITE_ANALYTICS_DOMAIN` ou `VITE_ANALYTICS_ID`
      (passo 24)
20. **(eu)** Tirar o modo de demonstração do workflow de deploy (`--mode demo`
    → build normal). **Só depois de 7 a 19 estarem feitos** — antes disso o
    site publicado ficava com um painel que não abre e galerias que não
    funcionam.
21. **Confirmar que está tudo de pé:**
    ```bash
    ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run setup:check
    ```
    Vai ao Supabase, faz login, pede um upload assinado, escreve mesmo no R2 e
    apaga o ficheiro de teste. Diz qual é o primeiro passo que falta.

## 6. Formulário de contacto e emails

22. **Conta no Formspree** (ou Web3Forms). Criar um form, copiar o endpoint,
    pô-lo no secret `VITE_CONTACT_ENDPOINT`. Sem isto o formulário abre o
    programa de email do visitante em vez de enviar — funciona, mas perde
    pedidos de quem não tem email configurado no telemóvel.
23. **Resposta automática ao cliente** — depende do passo 1 (domínio
    verificado, senão vai para spam). No Formspree é uma opção do painel deles,
    sem código nenhum: ativar *Autoresponse* e escrever o texto. Se preferires
    que seja o nosso sistema a enviar, diz — é uma função a mais, e nessa altura
    entra também a cópia do pedido para o cliente.

## 7. Estatísticas

24. **Conta no Plausible** (~9 €/mês) **ou Umami** (plano gratuito na cloud
    deles, ou auto-alojado). Copiar o script e preencher os secrets do passo 19.
    Escolher só ferramentas **sem cookies** — é o que dispensa o aviso de
    cookies e mantém a política de privacidade como está.

## 8. Coisas que só vocês podem dar

25. **Dados da entidade responsável** para a política de privacidade: nome
    fiscal, NIF e morada. Está lá um comentário a marcar o sítio
    (`src/pages/Privacy.tsx`). O RGPD obriga a identificar quem trata os dados,
    e um nome de marca sozinho não chega. Vale um advogado dar uma vista de
    olhos antes de considerarem o texto final.
26. **Testemunhos reais**, com autorização de quem os escreveu. Painel → Site →
    Testemunhos. Enquanto não houver nenhum publicado, a secção não existe no
    site.
27. **Retratos da equipa** — três fotografias vossas, no vosso estilo. É a
    ausência mais estranha do site: são fotógrafos e não há uma cara.
28. **Showreel** — 30 a 40 segundos, para a página inicial. Continua a ser a
    maior subida que este site pode dar.
29. **Preços indicativos e FAQ**, se decidirem avançar com isso.

## 9. Depois de estar tudo no ar

30. **Google Search Console** — verificar o domínio e submeter
    `https://nebula.pt/sitemap.xml`.
31. **Google Business Profile** — é o que aparece a quem procura "fotógrafo
    casamento" no telemóvel, e não depende do site.
32. **Primeira galeria a sério**, de ponta a ponta: criar, carregar, publicar,
    entregar o link a alguém de confiança e ver o registo de atividade a
    responder.

---

## Ordem curta, se quiseres começar já

Domínio (1-3) → Supabase (7-11) → R2 (12-16) → ligar (17-18) → secrets do
GitHub (19) → dizer-me para tirar o modo de demonstração (20) → `setup:check`
(21).

O resto pode vir depois, sem pressa.
