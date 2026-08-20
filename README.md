# NEBULA

Site da NEBULA — produtora audiovisual de fotografia editorial e vídeo
cinematográfico para casamentos, maternidade e eventos, entre Lisboa e
Portalegre.

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS 4 · framer-motion · Lenis
**Deploy:** GitHub Pages em `https://danielrovisco.github.io/Nebula/`, automático
a cada push para `main` (`.github/workflows/deploy.yml`).

> **A pôr de pé pela primeira vez?** `ARRANQUE.md` tem a lista completa e por
> ordem do que é preciso fazer fora do código — domínio, Supabase, R2, secrets,
> formulário e estatísticas. Este ficheiro explica o porquê; esse é a lista de
> tarefas.

## Desenvolvimento

```bash
npm install
npm run dev      # servidor de desenvolvimento
npm run demo     # idem, com galerias de exemplo (ver "Modo de demonstração")
npm run setup:check  # diagnostica a configuração das galerias privadas
npm run build    # tsc + build de produção para dist/
npm run preview  # servir o build de produção localmente
npm run lint
npm run images   # regenerar derivados responsivos das fotografias (AVIF + WebP)
npm run icons    # regenerar os ícones do site a partir do símbolo da marca
npm run gen      # sitemap, robots, manifest e CNAME a partir do site.config.json
npm run setup    # ligar o site ao Supabase e ao R2 (ver ARRANQUE.md)
```

## Imagens

As fotografias originais vivem em `originals/portfolio/` — **fora de `public/`**,
porque tudo o que está em `public/` é copiado para `dist/` e publicado, e os
ficheiros de origem não têm de ser servidos a ninguém. O script `npm run images` gera, para cada original:

- `<nome>-480.webp`, `<nome>-960.webp`, `<nome>-1440.webp` — servidos por
  `srcset`, o browser escolhe conforme o viewport
- `<nome>.jpg` — fallback recomprimido para browsers sem WebP

Os derivados são versionados no repositório, para o workflow de deploy não
precisar do `sharp`. **Ao adicionar uma foto nova:** colocá-la em
`originals/portfolio/`, correr `npm run images`, e referenciá-la pelo slug (sem extensão) através do
componente `<Picture>`.

Todas as imagens de conteúdo passam pelo `src/lib/Picture.tsx`, que trata do
`srcset`, do `sizes`, do lazy loading e da prioridade de carregamento. A imagem
de hero da página inicial usa `priority` e tem um `<link rel="preload">` no
`index.html` — as duas coisas têm de se manter em sincronia se o hero mudar.

## Contactos

Todo o contacto é feito por **email ou Instagram** — não há número de telefone.
Os endereços estão centralizados em `src/lib/site.ts` (`CONTACT`); nada deve
ser escrito à mão nos componentes.

## Formulário de contacto

Por omissão o formulário abre o cliente de email do visitante já preenchido
(`mailto:`), o que funciona sem serviços de terceiros.

Para receber as mensagens por HTTP em vez disso, definir
`VITE_CONTACT_ENDPOINT` (ver `.env.example`) com o URL de um serviço de
formulários — Formspree, Web3Forms ou equivalente. O formulário passa a
submeter por `POST` em JSON (`name`, `email`, `service`, `date`, `location`,
`message`) e o
visitante nunca sai do site. Em ambiente de deploy, a variável tem de ser
definida como secret no workflow do GitHub Actions.

## SEO

**Mudar de domínio é editar `site.config.json` e mais nada.** Dele saem o `base`
do Vite, o `basename` do router, o `SITE_URL` (e com ele os canonical, og:image
e hreflang), o `sitemap.xml`, o `robots.txt`, o `site.webmanifest`, o JSON-LD do
negócio e o ficheiro `CNAME`. Os quatro ficheiros de `public/` são gerados por
`npm run gen`, que corre sozinho antes de cada build — estavam escritos à mão e
o sitemap já tinha catorze endereços a desatualizar-se em silêncio.

Cada página declara os seus metadados via `<Seo>`, que escreve
`title`/`description`/`canonical`/`hreflang`/Open Graph no cliente — e a
pré-renderização abaixo grava-os no HTML servido, para não dependerem disso.

**Pré-renderização.** O build acaba com `scripts/prerender.mjs`, que abre o
site já construído num Chromium e guarda o HTML de cada página pública em
`dist/<rota>/index.html`. Assim o título, a descrição, o canonical e as
hreflang existem no HTML servido, sem depender de o cliente executar
JavaScript — é o que faz as pré-visualizações de links do WhatsApp e do
Instagram mostrarem a página certa. Requer o Chromium (`npx playwright install
chromium`); localmente, `PLAYWRIGHT_CHROMIUM_PATH` aponta para um já instalado.
No workflow o passo é tolerante a falhas: se a captura falhar, publica-se a
versão SPA como antes.

A captura corre com `prefers-reduced-motion` ativo, e é isso que faz o site
entregar-se estático e completo. Um efeito lateral útil: qualquer animação que
não respeite essa preferência aparece congelada no HTML e é apanhada ali.

`public/robots.txt` está presente mas, num project site do GitHub Pages, os
crawlers só leem o `robots.txt` da raiz do domínio (`danielrovisco.github.io`),
que este repositório não controla. Passa a ser respeitado assim que houver
domínio próprio. O `sitemap.xml` funciona independentemente disso, desde que
submetido no Google Search Console.

## Acessibilidade

O site respeita `prefers-reduced-motion`: com essa preferência ativa, o scroll
suave (Lenis), o parallax do hero, os reveals e as transições de página são
desligados e o conteúdo é entregue estático.

## Painel de administração

`/admin` tem dois separadores:

- **Galerias** — as entregas privadas a clientes (ver secção seguinte). A lista
  mostra o espaço já ocupado no R2, e cada galeria tem um botão **Ver como o
  cliente** que abre a entrega tal como ele a vê, sem precisar da password
  dele. Nessa pré-visualização não há comprovativo de acesso, por isso nada
  fica registado nem marcado como escolha do cliente.
- **Site** — o conteúdo público: as fotos e as categorias do portfólio, e os
  testemunhos de clientes.

### Separador Site

O que se muda aqui aparece no site **sem deploy**. Requer um segundo bucket R2,
este **público** (as imagens do site não podem depender de links assinados, que
expiram e não são cacheáveis nem indexáveis):

1. R2 → Create bucket, ex. `nebula-site`. Ativar **Public access** (r2.dev ou
   domínio próprio) e copiar o URL público.
2. `supabase secrets set R2_PUBLIC_BUCKET=nebula-site`
3. No site: `VITE_R2_PUBLIC_URL=https://<url-publico-do-bucket>`

**Rede de segurança:** enquanto não houver fotos carregadas — ou se o Supabase
estiver a dormir, em baixo, ou o bucket por configurar — o portfólio continua a
mostrar as fotos que estão no código. O site nunca aparece vazio, e o conteúdo
do código é renderizado no primeiro frame, sem esperar pela rede.

O conteúdo público é lido por `fetch` direto ao PostgREST, não pelo SDK do
Supabase: importar o SDK na página de portfólio arrastava 215 kB de JavaScript
para uma página de marketing. O SDK fica reservado ao painel.

**Testemunhos.** Não há nenhum escrito no código, e a secção da página inicial
só existe depois de haver testemunhos publicados no painel. Cada testemunho
nasce escondido: escreve-se com calma e publica-se quando o cliente autorizar o
nome. Inventar elogios seria falsificar exatamente aquilo que a secção existe
para provar.

## Duas línguas

O site existe em português e inglês, com um endereço próprio para cada página em
cada língua (`/servicos` e `/en/services`). A língua sai do endereço — não há
estado guardado — o que faz um link partilhado abrir na língua em que foi
partilhado, e permite ao Google indexar as duas versões como traduções uma da
outra (`hreflang`) em vez de conteúdo duplicado.

Os textos vivem em `src/lib/i18n/pt.ts` e `en.ts`. **O inglês é tipado contra o
português**: falta uma chave e o build falha. Ao escrever texto novo, escreve-se
primeiro em `pt.ts` e o compilador encarrega-se de lembrar a tradução. O painel
de administração fica só em português — é interno.

## Estatísticas de visitas

Sem `VITE_ANALYTICS_SRC` definido no build, o site não carrega script nenhum e
não faz um único pedido a terceiros. Suporta ferramentas **sem cookies**
(Plausible via `VITE_ANALYTICS_DOMAIN`, Umami via `VITE_ANALYTICS_ID`) — ver
`.env.example`. É deliberado: sem cookies não há consentimento a pedir e o site
dispensa o aviso. Pôr aqui Google Analytics obriga a um banner a sério e a mudar
a política de privacidade.

## Galerias privadas

> **Estado atual: o site publicado está em modo de demonstração.**
> O workflow de deploy corre `npm run build:demo`, por isso `/admin` abre sem
> login e as galerias são de brincar. É temporário, para avaliar o desenho.
> Antes de ligar o Supabase a sério, trocar de volta para `npm run build` em
> `.github/workflows/deploy.yml` — está lá um aviso a dizê-lo.

Cada cliente recebe um link `/galeria/<código>` e uma password. A administração
das galerias vive em `/admin` — **não há link para lá em lado nenhum do site**,
por opção.

### Porque é que isto precisa de backend

O site é estático no GitHub Pages, e num site estático uma password em
JavaScript não protege nada: os ficheiros continuam acessíveis por URL direto a
quem o souber. Além disso o Pages tem um limite de 1 GB de site publicado, que
uma única galeria de casamento em tamanho real esgota.

O trabalho está dividido por dois serviços, ambos no plano gratuito:

- **Supabase** — base de dados, autenticação do painel e Edge Functions. Só
  guarda metadados (títulos, códigos, caminhos), que cabem de sobra nos 500 MB
  gratuitos.
- **Cloudflare R2** — as fotografias, num bucket **privado**. São 10 GB
  gratuitos e, mais importante, **tráfego de saída sempre grátis**: o custo real
  de um serviço destes não é guardar ficheiros, é os clientes descarregarem-nos.

A password é verificada **no servidor**. O browser nunca recebe um URL de
ficheiro sem antes acertar na password, e os URLs que recebe são pré-assinados
e expiram ao fim de 2 horas. As credenciais do R2 vivem só nos secrets das Edge
Functions — nunca chegam ao browser.

O `supabase/schema.sql` é validado contra um PostgreSQL real. Para o correr:

```bash
createdb nebula_test
psql -d nebula_test -f supabase/tests/scaffold.sql
psql -d nebula_test -f supabase/schema.sql
psql -d nebula_test -f supabase/tests/security.sql   # 19 linhas, todas SIM
```

O `scaffold.sql` imita o Supabase, e o detalhe que importa é este: **o pgcrypto
vive no schema `extensions`, não no `public`**. Testar com ele em `public` dá
falsos positivos — foi assim que passaram 20 testes verdes com um `search_path`
que fazia o `gen_salt()` não ser encontrado no Supabase real. O schema funciona
agora nas duas disposições.

Os testes cobrem hash bcrypt com salt por galeria, password em claro nunca
guardada, recusa de rascunhos e galerias expiradas, bloqueio após 10 tentativas
falhadas, e `anon` sem permissão para verificar passwords ou alterá-las. São
repetíveis e não deixam dados para trás.

As Edge Functions continuam por estrear em execução real — não há Deno neste
ambiente.

### Instalação (uma vez)

A qualquer momento, para saber em que pé estás:

```bash
npm run setup:check
```

Percorre a cadeia toda — variáveis, projeto, esquema, as duas Edge Functions,
credenciais do R2, escrita no bucket e CORS — e diz qual o primeiro passo que
falta e o que fazer. Com `ADMIN_EMAIL` e `ADMIN_PASSWORD` definidos faz também
o teste completo: login, pedir um upload assinado, escrever mesmo no R2 e
apagar o ficheiro de teste.

```bash
ADMIN_EMAIL=eu@proj3ctnebula.pt ADMIN_PASSWORD=... npm run setup:check
```

**1. Supabase**

1. Criar o projeto em supabase.com (ou reutilizar um existente).
2. SQL Editor → colar `supabase/schema.sql` → Run. Cria as tabelas, as
   políticas RLS e as funções de password.
3. Authentication → Users → Add user, com o email e password de quem vai gerir.
   Não há registo aberto — só entra quem for criado aqui.

**2. Cloudflare R2**

1. No painel da Cloudflare: R2 → Create bucket, com o nome `galleries`.
   Deixá-lo **privado** (sem acesso público nem domínio ligado).
2. R2 → Manage API Tokens → criar um token com permissão de leitura e escrita
   nesse bucket. Guardar o Access Key ID e o Secret.
3. Anotar o Account ID (aparece na barra lateral do R2).
4. **CORS do bucket** — sem isto o browser recusa o upload. Em Settings → CORS
   policy do bucket:
   ```json
   [{
     "AllowedOrigins": ["https://danielrovisco.github.io", "http://localhost:5173"],
     "AllowedMethods": ["PUT", "GET"],
     "AllowedHeaders": ["content-type"],
     "MaxAgeSeconds": 3600
   }]
   ```

**3. Ligar os dois**

```bash
supabase secrets set \
  R2_ACCOUNT_ID=... \
  R2_ACCESS_KEY_ID=... \
  R2_SECRET_ACCESS_KEY=... \
  R2_BUCKET=galleries

supabase functions deploy gallery-access --no-verify-jwt
supabase functions deploy gallery-log --no-verify-jwt
supabase functions deploy admin-storage
```

O `--no-verify-jwt` na primeira é necessário porque o cliente é anónimo: quem
autoriza é a password da galeria, validada lá dentro. A segunda fica **com**
verificação de JWT, porque só o admin autenticado lhe pode chamar.

**4. Variáveis do site** (ver `.env.example`): `VITE_SUPABASE_URL` e
`VITE_SUPABASE_ANON_KEY`, em `.env.local` para desenvolvimento e como *secrets*
no workflow do GitHub Actions para o site publicado. As mesmas duas servem para
o workflow `keepalive.yml`.

A chave anónima pode ser pública — é para isso que serve. O que nunca pode sair
do servidor é a `service_role` do Supabase e as credenciais do R2.

### O projeto adormece

O plano gratuito do Supabase pausa um projeto ao fim de 7 dias sem tráfego, e
acordar demora ~30 segundos — mau num link entregue a um cliente. O workflow
`.github/workflows/keepalive.yml` toca no projeto a cada 3 dias para o evitar.
Enquanto os secrets não existirem, sai em silêncio.

### Utilização

**Criar uma galeria:** `/admin` → Nova galeria. O código do URL é sugerido a
partir do título e a password é gerada de forma legível ao telefone
(`norte-1609`). Nasce em rascunho — não abre a ninguém, nem com a password
certa, até carregares em Publicar.

**Carregar fotos:** arrasta para a área da galeria ou usa o botão. Cada foto
gera uma miniatura no browser antes do upload, para a grelha do cliente não ter
de carregar ficheiros em tamanho real, e sobe direto para o R2 sem passar pelas
Edge Functions. A ordem define-se arrastando, ou pelas setas em cada foto (o
arrasto não funciona ao toque).

**Reduzir no upload:** ligado por omissão, limita as fotos a 3000px no lado
maior. Ocupa 3 a 5 vezes menos espaço sem diferença visível numa galeria de
entrega, e é o que faz os 10 GB gratuitos chegarem para uma temporada.
Desliga-o quando quiseres entregar em resolução máxima. O valor está em
`DELIVERY_EDGE`, em `src/lib/gallery/api.ts`.

**Password esquecida:** não há como a recuperar — está guardada cifrada com
bcrypt. Define uma nova no editor da galeria.

**Prazo:** o campo "Expira em" fecha a galeria a partir dessa data sem apagar
nada.

### A capa

No editor da galeria, a secção **Capa** define o primeiro ecrã que o cliente vê:

- **Fotografia** — clica na estrela de uma das miniaturas. Sem escolha, usa a
  primeira da galeria.
- **Texto sobre a capa** — vazio usa o título.
- **Tipo de letra** — serifada itálica, sem serifa, ou maiúsculas espaçadas.
  São as três do site, sem downloads extra.
- **Logo** — branco, preto, ou nenhum.

A pré-visualização por baixo mostra o resultado enquanto escreves.

### O que o cliente vê

Entra em `/galeria`, ou direto em `/galeria/<código>` com o código já
preenchido. Depois da password acertada:

1. **Introdução** — o símbolo, uma linha a desenhar-se e as boas-vindas pelo
   primeiro nome. Dura ~3,4s, salta-se com um toque, aparece uma vez por
   sessão e é ignorada por inteiro com `prefers-reduced-motion`.
2. **Capa** — fotografia a ecrã inteiro, texto centrado e o logo escolhido.
3. **Galeria** — grelha com miniaturas, visualizador com setas e teclado,
   download ficheiro a ficheiro (também na grelha, sem abrir) e
   "Descarregar tudo" em ZIP.

A galeria aberta corre sem a navegação do site: a capa já tem o seu logo, e a
navbar por cima punha dois logos NEBULA no mesmo ecrã. O caminho de volta é o
link no fim.

O acesso fica guardado no separador durante 2 horas; passado isso, volta a
pedir a password. Os botões de download desaparecem se desligares o download
nas definições da galeria.

### Registo de atividade

Cada galeria tem uma secção **Atividade** no painel, com o que o cliente fez:

```
Cliente descarregou o álbum completo        agora mesmo
Cliente descarregou palace-dome.jpg         há 2 horas
Cliente abriu a galeria                     há 4 horas
```

A abertura é registada pela própria `gallery-access`. Os downloads são
registados pela `gallery-log`, que **exige o comprovativo de acesso** — um
token HMAC assinado que a `gallery-access` entrega a quem acertou na password.
Sem ele, com um de outra galeria, ou passadas as 2 horas, nada é escrito: é o
que impede alguém de encher o registo com downloads inventados. O token não é
uma credencial de acesso; sozinho não abre ficheiro nenhum.

Guarda-se o que aconteceu e quando, e mais nada — sem IPs nem identificadores
de dispositivo. Apagar a galeria apaga o registo com ela.

Se o registo falhar, o download do cliente segue à mesma. Nunca vale a pena
estragar uma entrega por causa de uma linha de log.

### Vídeos

O upload aceita vídeo além de fotografia. A miniatura é tirada de um fotograma
no browser, a grelha marca-os com um símbolo de play e o visualizador abre-os
com controlos. Os vídeos sobem sempre intactos — a redução de resolução só se
aplica a imagens, porque recodificar vídeo no browser não é viável.

### Limites que vale a pena conhecer

- **O ZIP é montado na memória do dispositivo.** Acima de ~1,5 GB a interface
  avisa antes de tentar. Em galerias muito grandes, o download foto a foto é
  mais seguro, sobretudo em telemóvel.
- **Dez tentativas falhadas por hora** bloqueiam o acesso a uma galeria, mesmo
  com a password correta. Volta a abrir sozinho ao fim de uma hora.
- **10 GB gratuitos são cerca de uma temporada com a redução ligada**, ou uma
  ou duas entregas em resolução máxima. Acima disso o R2 cobra por
  armazenamento mas continua a não cobrar tráfego. Confirma os valores atuais
  antes de contar com eles.

### Modo de demonstração

Para ver o painel e a galeria do cliente sem Supabase nenhum configurado:

```bash
npm install
npm run demo
```

e abrir `http://localhost:5173/Nebula/admin` (o painel entra direto, sem
login) ou `http://localhost:5173/Nebula/galeria` (o lado do cliente; código
`ana-e-tiago`, password `demo`).

A entrada sem login existe **só em demonstração**, onde os dados são falsos e
a autenticação aceitaria tudo de qualquer maneira. No build de produção o
painel exige sempre login — o ecrã de acesso não é dispensável por variável de
ambiente nenhuma. Vêm duas galerias de
exemplo, uma publicada e outra em rascunho, com as fotos do próprio portfólio.

Por baixo, `npm run demo` é `vite --mode demo`, que carrega o `.env.demo` com
`VITE_DEMO_GALLERIES=true`. O `npm run build` não lê esse ficheiro, por isso o
modo de demonstração não escapa para o site publicado. Tem
de ser ligado à mão — **nunca é um fallback automático**. Um deploy sem
configuração mostra um aviso e recusa o acesso, em vez de servir um cadeado
decorativo com ar de verdadeiro.
