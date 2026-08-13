# NEBULA

Site da NEBULA — produtora audiovisual de fotografia editorial e vídeo
cinematográfico para casamentos, maternidade e eventos, entre Lisboa e
Portalegre.

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS 4 · framer-motion · Lenis
**Deploy:** GitHub Pages em `https://danielrovisco.github.io/Nebula/`, automático
a cada push para `main` (`.github/workflows/deploy.yml`).

## Desenvolvimento

```bash
npm install
npm run dev      # servidor de desenvolvimento
npm run demo     # idem, com galerias de exemplo (ver "Modo de demonstração")
npm run build    # tsc + build de produção para dist/
npm run preview  # servir o build de produção localmente
npm run lint
npm run images   # regenerar derivados responsivos das fotografias
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
submeter por `POST` em JSON (`name`, `email`, `service`, `message`) e o
visitante nunca sai do site. Em ambiente de deploy, a variável tem de ser
definida como secret no workflow do GitHub Actions.

## SEO

`src/lib/site.ts` tem o `SITE_URL` — é o único sítio a mudar quando houver
domínio próprio (juntamente com o `base` no `vite.config.ts` e o `basename` do
router em `src/main.tsx`). Dele derivam o `canonical`, o `og:image` e o
`sitemap`.

Cada página declara os seus metadados via `<Seo>`, que escreve
`title`/`description`/`canonical`/Open Graph no cliente. Como é uma SPA, os
crawlers que não executam JavaScript vêem apenas os metadados do `index.html`
— o Googlebot executa JS, mas se o SEO se tornar crítico o passo seguinte é
pré-renderizar as rotas no build.

`public/robots.txt` está presente mas, num project site do GitHub Pages, os
crawlers só leem o `robots.txt` da raiz do domínio (`danielrovisco.github.io`),
que este repositório não controla. Passa a ser respeitado assim que houver
domínio próprio. O `sitemap.xml` funciona independentemente disso, desde que
submetido no Google Search Console.

## Acessibilidade

O site respeita `prefers-reduced-motion`: com essa preferência ativa, o scroll
suave (Lenis), o parallax do hero, os reveals e as transições de página são
desligados e o conteúdo é entregue estático.

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

O `supabase/schema.sql` foi validado contra um PostgreSQL 16 real: corre sem
erros, é idempotente (segunda passagem não estraga dados) e passa 20 testes de
comportamento — hash bcrypt com salt por galeria, password em claro nunca
guardada, recusa de rascunhos e galerias expiradas, bloqueio após 10 tentativas
falhadas, e `anon` sem permissão para verificar passwords ou alterá-las.

A Edge Function continua por estrear em execução real — não há Deno neste
ambiente.

### Instalação (uma vez)

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

### O que o cliente vê

Entra em `/galeria`, ou direto em `/galeria/<código>` com o código já
preenchido. Depois da password: grelha com miniaturas, lightbox com setas e
teclado, download foto a foto e "Descarregar tudo" em ZIP. O acesso fica
guardado no separador durante 2 horas; passado isso, volta a pedir a password.

O botão de download desaparece se desligares o download nas definições da
galeria.

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
