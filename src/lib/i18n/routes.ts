export type Lang = 'pt' | 'en'

export const LANGS: Lang[] = ['pt', 'en']

/**
 * Cada página tem um endereço próprio em cada língua.
 *
 * Podíamos ter feito `/en/servicos` e poupar metade disto, mas um visitante
 * inglês a ver "servicos" no endereço percebe logo que a versão inglesa é um
 * remendo — e o Google indexa endereços, não traduções. Assim são duas páginas
 * a sério, cada uma com o seu canonical e as suas hreflang.
 */
export const ROUTES = {
  home: { pt: '/', en: '/en' },
  about: { pt: '/sobre', en: '/en/about' },
  services: { pt: '/servicos', en: '/en/services' },
  portfolio: { pt: '/portfolio', en: '/en/portfolio' },
  contact: { pt: '/contacto', en: '/en/contact' },
  gallery: { pt: '/galeria', en: '/en/gallery' },
  privacy: { pt: '/privacidade', en: '/en/privacy' },
} as const

export type RouteKey = keyof typeof ROUTES

/** A galeria aberta: /galeria/<slug>/ver e /en/gallery/<slug>/view. */
export const GALLERY_VIEW = { pt: 'ver', en: 'view' } as const

export const langFromPath = (pathname: string): Lang =>
  pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'pt'

export const path = (key: RouteKey, lang: Lang) => ROUTES[key][lang]

/**
 * O mesmo endereço na outra língua, para o seletor não atirar sempre para a
 * página inicial: quem está nos serviços em português quer os serviços em
 * inglês, não a home.
 */
export function switchLang(pathname: string, para: Lang): string {
  const atual = langFromPath(pathname)
  if (atual === para) return pathname

  for (const key of Object.keys(ROUTES) as RouteKey[]) {
    const base = ROUTES[key][atual]
    if (pathname === base) return ROUTES[key][para]
    // Sub-rotas das galerias: /galeria/<slug>[/ver]
    if (key === 'gallery' && pathname.startsWith(`${base}/`)) {
      const resto = pathname.slice(base.length + 1)
      const partes = resto.split('/')
      const traduzido = partes.map((p) =>
        p === GALLERY_VIEW[atual] ? GALLERY_VIEW[para] : p,
      )
      return `${ROUTES.gallery[para]}/${traduzido.join('/')}`
    }
  }
  // Endereço desconhecido (uma 404, por exemplo): volta ao início da língua.
  return ROUTES.home[para]
}
