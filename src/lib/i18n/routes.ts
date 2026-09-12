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
  thanks: { pt: '/obrigado', en: '/en/thank-you' },
} as const

export type RouteKey = keyof typeof ROUTES

/**
 * Cada serviço tem endereço próprio, e traduzido.
 *
 * Antes os quatro viviam em /servicos e trocavam-se por abas. Para quem visita
 * dava no mesmo; para o Google era uma página só a competir com quatro
 * pesquisas diferentes, e a ganhar nenhuma. Com endereços próprios, quem
 * procura "fotógrafo de maternidade" encontra uma página sobre maternidade e
 * não uma página sobre tudo.
 */
export const SERVICOS = {
  casamentos: { pt: 'casamentos', en: 'weddings' },
  maternidade: { pt: 'maternidade', en: 'maternity' },
  retratos: { pt: 'retratos', en: 'portraits' },
  eventos: { pt: 'eventos', en: 'events' },
} as const

export type ServicoId = keyof typeof SERVICOS

/** O endereço completo de um serviço numa língua. */
export const servicoPath = (id: ServicoId, lang: Lang) =>
  `${ROUTES.services[lang]}/${SERVICOS[id][lang]}`

/** De volta: que serviço é este pedaço de endereço, nesta língua. */
export function servicoDoSlug(slug: string | undefined, lang: Lang): ServicoId | null {
  if (!slug) return null
  const par = (Object.keys(SERVICOS) as ServicoId[]).find((id) => SERVICOS[id][lang] === slug)
  return par ?? null
}

/**
 * O grupo a que um endereço pertence: o mesmo caminho, com o serviço aberto
 * cortado fora.
 *
 * Os quatro serviços são a mesma página com conteúdo diferente, e há duas
 * coisas que têm de saber isso: a transição de página (senão trocar de serviço
 * parece recarregar o site) e o salto para o topo (senão a página foge para
 * cima a cada aba clicada). Ambas comparam grupos, e não caminhos.
 */
export const grupoDeRota = (pathname: string) =>
  pathname.replace(/^(\/en)?(\/servicos|\/services)\/[^/]+$/, '$1$2')

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

  // Um serviço traduz-se para o mesmo serviço na outra língua, e não para a
  // lista: quem está a ler sobre casamentos quer ler sobre casamentos.
  const baseServicos = ROUTES.services[atual]
  if (pathname.startsWith(`${baseServicos}/`)) {
    const id = servicoDoSlug(pathname.slice(baseServicos.length + 1), atual)
    if (id) return servicoPath(id, para)
  }

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
