import { useEffect, useState } from 'react'
import { fetchPortfolio, fetchTestimonials, publicUrl } from './public'
import type { Testimonial } from './types'

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

/**
 * Testemunhos publicados, vindos do painel.
 *
 * Chegaram a estar no código enquanto a base de dados não existia. Saíram
 * quando lá entraram, e não por arrumação: com as duas cópias, apagar os três
 * no painel fazia-os reaparecer sozinhos na visita seguinte, porque o site
 * voltava a cair na cópia do código. Uma rede de segurança que desfaz o que se
 * acabou de decidir é pior do que não a ter.
 *
 * Sem nenhum publicado, a secção inteira desaparece do site em vez de ficar um
 * espaço a dizer "em breve".
 */
export function useTestimonials(): Testimonial[] {
  const [lista, setLista] = useState<Testimonial[]>([])

  useEffect(() => {
    let vivo = true
    fetchTestimonials().then((t) => vivo && t.length && setLista(t))
    return () => {
      vivo = false
    }
  }, [])

  return lista
}
