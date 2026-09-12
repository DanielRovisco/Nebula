import { SITE_URL } from './site'

/*
  Barra final, como no canonical e no sitemap.

  Não é estética: a pré-renderização escreve cada rota como
  `dist/<rota>/index.html` e o GitHub Pages serve pastas com barra, por isso
  `/servicos/casamentos` leva um 301 para `/servicos/casamentos/`. As migalhas
  declaravam o endereço que redirecciona enquanto o canonical da mesma página
  declarava o outro, e ficavam os dois a apontar para sítios diferentes na
  mesma página.
*/
const comBarra = (p: string) => (p.endsWith('/') ? p : `${p}/`)

/** O mesmo caminho, em schema.org. `caminhos` são já os URLs de cada nível. */
export function breadcrumbJsonLd(niveis: { nome: string; caminho: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: niveis.map((n, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: n.nome,
      item: `${SITE_URL}${comBarra(n.caminho)}`,
    })),
  }
}
