import { SITE_URL } from './site'

/** O mesmo caminho, em schema.org. `caminhos` são já os URLs de cada nível. */
export function breadcrumbJsonLd(niveis: { nome: string; caminho: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: niveis.map((n, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: n.nome,
      item: `${SITE_URL}${n.caminho}`,
    })),
  }
}
