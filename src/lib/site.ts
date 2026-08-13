// Fonte única de verdade para URL público e contactos.
// Quando o domínio próprio estiver ativo, basta mudar SITE_URL (e o `base` no
// vite.config.ts) — tudo o resto (canonical, og:image, sitemap, JSON-LD) segue.
export const SITE_URL = 'https://danielrovisco.github.io/Nebula'

export const CONTACT = {
  email: 'nebula.pdstudio@gmail.com',
  instagram: 'https://www.instagram.com/proj3ct.nebula/',
  instagramHandle: '@proj3ct.nebula',
  instagramDm: 'https://ig.me/m/proj3ct.nebula',
} as const

// Absolutiza um caminho do site para uso em metadados (og:image, canonical,
// sitemap) — os crawlers sociais rejeitam caminhos relativos.
export const absoluteUrl = (path: string) => `${SITE_URL}/${path.replace(/^\//, '')}`
