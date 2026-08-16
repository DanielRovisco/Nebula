import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { SITE_URL, absoluteUrl } from './site'
import { langFromPath, switchLang } from './i18n/routes'

const DEFAULT_OG = absoluteUrl('/brand/logo-mix-white.png')

interface SeoProps {
  title: string
  description: string
  /** Caminho absoluto da imagem de partilha (og:image). */
  image?: string
  /** Páginas que não devem entrar no índice (404, privacidade). */
  noindex?: boolean
  /**
   * Dados estruturados desta página (schema.org). O `LocalBusiness` do negócio
   * está no index.html e vale para o site todo; isto acrescenta o que é próprio
   * de cada página — o serviço, a coleção de imagens, as migalhas.
   */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/**
 * Metadados por rota. Numa SPA o HTML servido é sempre o mesmo, por isso o
 * title/description/canonical são escritos no cliente — e a pré-renderização
 * (scripts/prerender.mjs) grava o resultado no HTML publicado, para não
 * dependerem de o visitante executar JavaScript.
 */
export default function Seo({ title, description, image, noindex = false, jsonLd }: SeoProps) {
  const { pathname } = useLocation()

  useEffect(() => {
    document.title = title

    // O index.html traz `index, follow`; aqui só se troca o valor, para não
    // ficarem duas metas `robots` a dizer o contrário uma da outra. Ao sair da
    // página o efeito repõe o valor original (ver o return).
    setMeta(
      'meta[name="robots"]',
      'name',
      'robots',
      noindex ? 'noindex, follow' : 'index, follow',
    )

    setMeta('meta[name="description"]', 'name', 'description', description)
    setMeta('meta[property="og:title"]', 'property', 'og:title', title)
    setMeta('meta[property="og:description"]', 'property', 'og:description', description)
    setMeta('meta[property="og:image"]', 'property', 'og:image', image ?? DEFAULT_OG)
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title)
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description)
    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image ?? DEFAULT_OG)

    const url = `${SITE_URL}${pathname === '/' ? '/' : pathname}`
    setMeta('meta[property="og:url"]', 'property', 'og:url', url)

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = url

    // Um único <script> gerido por nós, substituído a cada página. Vários
    // acumulados dariam ao Google a soma dos dados de todas as páginas por onde
    // o visitante passou.
    const idJson = 'seo-jsonld'
    document.getElementById(idJson)?.remove()
    if (jsonLd) {
      const el = document.createElement('script')
      el.id = idJson
      el.type = 'application/ld+json'
      el.textContent = JSON.stringify(jsonLd)
      document.head.appendChild(el)
    }

    // Idioma da página e as suas alternativas. Sem isto o Google trata as duas
    // versões como conteúdo duplicado em vez de traduções uma da outra, e a
    // inglesa arrisca-se a nunca aparecer a quem procura em inglês.
    const lang = langFromPath(pathname)
    document.documentElement.lang = lang
    setMeta('meta[property="og:locale"]', 'property', 'og:locale', lang === 'pt' ? 'pt_PT' : 'en_GB')

    const alternativas: [string, string][] = [
      ['pt-PT', `${SITE_URL}${switchLang(pathname, 'pt')}`],
      ['en', `${SITE_URL}${switchLang(pathname, 'en')}`],
      // Diz ao Google o que servir a quem não procura em nenhuma das duas.
      ['x-default', `${SITE_URL}${switchLang(pathname, 'pt')}`],
    ]
    for (const [hreflang, href] of alternativas) {
      let link = document.head.querySelector<HTMLLinkElement>(
        `link[rel="alternate"][hreflang="${hreflang}"]`,
      )
      if (!link) {
        link = document.createElement('link')
        link.rel = 'alternate'
        link.hreflang = hreflang
        document.head.appendChild(link)
      }
      link.href = href
    }
  }, [title, description, image, noindex, jsonLd, pathname])

  return null
}
