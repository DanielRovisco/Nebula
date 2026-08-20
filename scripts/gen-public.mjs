/**
 * Gera o `sitemap.xml`, o `robots.txt`, o `site.webmanifest` e o `CNAME` a
 * partir do `site.config.json` e da tabela de rotas.
 *
 * Estavam os quatro escritos à mão, e o sitemap já tinha catorze endereços que
 * eu próprio escrevi um a um ao acrescentar a versão inglesa. Isso desatualiza-
 * se na primeira página nova, em silêncio, e um sitemap errado é pior do que
 * nenhum. Agora saem da mesma fonte que o site usa para navegar.
 *
 * Corre sozinho antes de cada build (ver o script `build` no package.json).
 */
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { unlink } from 'node:fs/promises'

const raiz = new URL('../', import.meta.url).pathname
const site = JSON.parse(await readFile(raiz + 'site.config.json', 'utf8'))
const origin = site.origin.replace(/\/$/, '')
const base = site.base.endsWith('/') ? site.base : `${site.base}/`
/*
  Sub-páginas sem barra final (/sobre, não /sobre/), mas a inicial mantém a
  dela: o canonical escrito pelo Seo.tsx é `https://dominio/`, e um sitemap a
  dizer `https://dominio` estaria a declarar um endereço diferente do que a
  própria página diz ser o seu. Só se nota quando o `base` é a raiz — com
  `/Nebula/` a barra vinha do próprio base.
*/
const url = (caminho) => {
  const completo = `${origin}${base}${caminho.replace(/^\//, '')}`
  const semBarra = completo.replace(/\/$/, '')
  return semBarra === origin ? `${origin}/` : semBarra
}

/**
 * As rotas públicas, com a prioridade que cada uma merece. A galeria entra
 * porque é a porta de entrada dos clientes; as galerias em si, o painel, a
 * página de obrigado e a 404 ficam de fora — são privadas ou noindex.
 */
const ROTAS = [
  ['/', 'monthly', '1.0'],
  ['/portfolio', 'monthly', '0.9'],
  ['/servicos', 'monthly', '0.9'],
  ['/sobre', 'yearly', '0.7'],
  ['/contacto', 'yearly', '0.8'],
  ['/galeria', 'yearly', '0.5'],
  ['/privacidade', 'yearly', '0.2'],
  ['/en', 'monthly', '0.9'],
  ['/en/portfolio', 'monthly', '0.8'],
  ['/en/services', 'monthly', '0.8'],
  ['/en/about', 'yearly', '0.6'],
  ['/en/contact', 'yearly', '0.7'],
  ['/en/gallery', 'yearly', '0.4'],
  ['/en/privacy', 'yearly', '0.2'],
]

// Cada página aponta para a sua tradução, como no <head> — é o que diz ao
// Google que são a mesma página em duas línguas, e não conteúdo repetido.
const PARES = {
  '/': '/en',
  '/portfolio': '/en/portfolio',
  '/servicos': '/en/services',
  '/sobre': '/en/about',
  '/contacto': '/en/contact',
  '/galeria': '/en/gallery',
  '/privacidade': '/en/privacy',
}
const inverso = Object.fromEntries(Object.entries(PARES).map(([pt, en]) => [en, pt]))

const alternativas = (caminho) => {
  const pt = inverso[caminho] ? caminho.replace(caminho, inverso[caminho]) : caminho
  const en = PARES[caminho] ?? caminho
  return [
    `    <xhtml:link rel="alternate" hreflang="pt-PT" href="${url(pt)}" />`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${url(en)}" />`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${url(pt)}" />`,
  ].join('\n')
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Gerado por scripts/gen-public.mjs. Não editar à mão. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${ROTAS.map(([caminho, freq, pri]) => `  <url>
    <loc>${url(caminho)}</loc>
${alternativas(caminho)}
    <changefreq>${freq}</changefreq>
    <priority>${pri}</priority>
  </url>`).join('\n')}
</urlset>
`

const robots = `# Gerado por scripts/gen-public.mjs. Não editar à mão.
User-agent: *
Allow: /
# O painel e as galerias de cliente não têm nada que ser indexados.
Disallow: ${base}admin
Disallow: ${base}galeria
Disallow: ${base}en/gallery

Sitemap: ${origin}${base}sitemap.xml
`

const manifest = {
  name: 'NEBULA — Fotografia & Vídeo',
  short_name: 'NEBULA',
  description:
    'Fotografia editorial e vídeo cinematográfico para casamentos, maternidade e eventos.',
  start_url: base,
  scope: base,
  display: 'standalone',
  background_color: '#191919',
  theme_color: '#191919',
  lang: 'pt-PT',
  icons: [
    { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
    { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
    {
      src: `${base}icons/icon-maskable-512.png`,
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
}

await writeFile(raiz + 'public/sitemap.xml', sitemap)
await writeFile(raiz + 'public/robots.txt', robots)
await writeFile(raiz + 'public/site.webmanifest', JSON.stringify(manifest, null, 2) + '\n')

// O CNAME só existe quando houver domínio próprio: num project site do GitHub
// Pages, um CNAME a apontar para o domínio errado tira o site do ar.
const cname = raiz + 'public/CNAME'
const dominioProprio = !origin.includes('github.io')
if (dominioProprio) {
  await writeFile(cname, `${origin.replace(/^https?:\/\//, '')}\n`)
} else if (existsSync(cname)) {
  await unlink(cname)
}

console.log(`Gerados a partir de site.config.json (${origin}${base}):`)
console.log(`  sitemap.xml       ${ROTAS.length} endereços`)
console.log('  robots.txt')
console.log('  site.webmanifest')
console.log(`  CNAME             ${dominioProprio ? 'sim' : 'não (ainda em github.io)'}`)
