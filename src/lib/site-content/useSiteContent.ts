import { useEffect, useState } from 'react'
import { fetchPortfolio, fetchSettings, publicUrl } from './public'
import { DEFAULT_SETTINGS, type SiteSettings } from './types'

export interface PortfolioItem {
  id: string
  src: string
  thumb: string
  alt: string
  category: string
  tall: boolean
  /** Só nas fotos que vêm do repositório: usa <Picture> com srcset local. */
  localName?: string
  /** object-position das fotos locais, afinado à mão. */
  pos?: string
}

/**
 * Portfólio do site: o que estiver no painel, ou o que vem no código.
 *
 * O conteúdo do código é devolvido de imediato, no primeiro render — a página
 * nunca pisca a vazio nem espera pela rede. Se houver conteúdo carregado no
 * painel, substitui-o quando chegar. Se o Supabase estiver a dormir ou em
 * baixo, o visitante nem dá por isso.
 */
export function usePortfolio(fallback: {
  categories: string[]
  items: PortfolioItem[]
}) {
  const [data, setData] = useState(fallback)

  useEffect(() => {
    let vivo = true
    fetchPortfolio().then((remoto) => {
      if (!vivo || !remoto) return
      const porId = new Map(remoto.categories.map((c) => [c.id, c.label]))
      setData({
        categories: remoto.categories.map((c) => c.label),
        items: remoto.photos.map((p) => ({
          id: p.id,
          src: publicUrl(p.storageKey),
          thumb: publicUrl(p.thumbKey ?? p.storageKey),
          alt: p.alt,
          category: (p.categoryId && porId.get(p.categoryId)) || 'Outros',
          tall: p.tall,
        })),
      })
    })
    return () => {
      vivo = false
    }
  }, [])

  return data
}

/** Definições do site, com os valores do código como ponto de partida. */
export function useSiteSettings(): SiteSettings {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    let vivo = true
    fetchSettings().then((s) => vivo && Object.keys(s).length && setSettings({ ...DEFAULT_SETTINGS, ...s }))
    return () => {
      vivo = false
    }
  }, [])

  return settings
}
