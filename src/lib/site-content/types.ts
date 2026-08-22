export interface SiteCategory {
  id: string
  slug: string
  label: string
  sortOrder: number
}

export interface Testimonial {
  id: string
  /** Quem assina — nomes próprios chegam. */
  author: string
  /** Contexto: tipo de trabalho, local, altura do ano. */
  context: string
  quote: string
  sortOrder: number
  published: boolean
}

/**
 * Testemunho usado apenas no modo de demonstração, para a secção ter alguma
 * coisa para desenhar. O texto assume-se como exemplo de propósito: a
 * demonstração está publicada, e um elogio inventado com ar de verdadeiro seria
 * uma avaliação falsa à vista de quem visita o site.
 */
export const DEMO_TESTIMONIAL: Testimonial = {
  id: 'demo-1',
  author: 'Exemplo',
  context: 'É assim que um testemunho fica no site',
  quote:
    'Aqui aparece o que os vossos clientes escreverem sobre o dia. Este texto é um exemplo da demonstração — os testemunhos reais escrevem-se no painel.',
  sortOrder: 0,
  published: true,
}

export interface SitePhoto {
  id: string
  categoryId: string | null
  storageKey: string
  thumbKey: string | null
  alt: string
  width: number | null
  height: number | null
  tall: boolean
  /** Recorte da miniatura, como `object-position` do CSS. */
  pos: string
  sortOrder: number
  published: boolean
}
