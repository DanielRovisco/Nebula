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
npm run build    # tsc + build de produção para dist/
npm run preview  # servir o build de produção localmente
npm run lint
npm run images   # regenerar derivados responsivos das fotografias
```

## Imagens

As fotografias originais vivem em `public/brand/portfolio/_originals/` e **não
são servidas ao visitante**. O script `npm run images` gera, para cada original:

- `<nome>-480.webp`, `<nome>-960.webp`, `<nome>-1440.webp` — servidos por
  `srcset`, o browser escolhe conforme o viewport
- `<nome>.jpg` — fallback recomprimido para browsers sem WebP

Os derivados são versionados no repositório, para o workflow de deploy não
precisar do `sharp`. **Ao adicionar uma foto nova:** colocá-la em `_originals/`,
correr `npm run images`, e referenciá-la pelo slug (sem extensão) através do
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
