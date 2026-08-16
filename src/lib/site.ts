import site from '../../site.config.json'

/**
 * URL público do site, sem barra no fim.
 *
 * Sai do `site.config.json`, que é também de onde saem o `base` do Vite e o
 * `basename` do router — mudar de domínio é mudar esse ficheiro e mais nada.
 * Daqui derivam os canonical, os og:image, as hreflang, o sitemap e o JSON-LD.
 */
export const SITE_URL = `${site.origin}${site.base}`.replace(/\/$/, '')

export const CONTACT = {
  email: 'nebula.pdstudio@gmail.com',
  instagram: 'https://www.instagram.com/proj3ct.nebula/',
  instagramHandle: '@proj3ct.nebula',
  instagramDm: 'https://ig.me/m/proj3ct.nebula',
} as const

// Absolutiza um caminho do site para uso em metadados (og:image, canonical,
// sitemap) — os crawlers sociais rejeitam caminhos relativos.
export const absoluteUrl = (path: string) => `${SITE_URL}/${path.replace(/^\//, '')}`
