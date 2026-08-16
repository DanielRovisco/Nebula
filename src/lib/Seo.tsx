import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { SITE_URL, absoluteUrl } from './site'

const DEFAULT_OG = absoluteUrl('/brand/logo-mix-white.png')

interface SeoProps {
  title: string
  description: string
  /** Caminho absoluto da imagem de partilha (og:image). */
  image?: string
  /** Páginas que não devem entrar no índice (404, privacidade). */
  noindex?: boolean
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
 * title/description/canonical são escritos no cliente — o que cobre partilhas
 * e o Googlebot (que executa JS). Um pré-render estático seria mais robusto
 * para crawlers que não executam JS, mas exigiria mudar o modelo de build.
 */
export default function Seo({ title, description, image, noindex = false }: SeoProps) {
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
  }, [title, description, image, noindex, pathname])

  return null
}
