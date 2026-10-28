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
    'Aqui aparece o que os vossos clientes escreverem sobre o dia. Este texto é um exemplo da demonstração; os testemunhos reais escrevem-se no painel.',
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
  /** `image/jpeg`, `video/mp4`… É o que distingue um vídeo de uma fotografia. */
  contentType: string | null
  sortOrder: number
  published: boolean
}

/**
 * Vídeo ou fotografia.
 *
 * O tipo declarado manda; a extensão do nome é o que resta para ficheiros
 * carregados antes de o tipo passar a ser guardado.
 */
export const ehVideo = (p: { contentType: string | null; storageKey?: string }) =>
  p.contentType?.startsWith('video/') ?? /\.(mp4|mov|webm|m4v)$/i.test(p.storageKey ?? '')

/**
 * Capa de um serviço, escolhida no painel.
 *
 * Sem capa carregada, a página de serviços usa a fotografia que vem no
 * repositório. É por isso que isto é opcional em todo o lado: o site tem de
 * funcionar antes de alguém ter mexido no painel, e continuar a funcionar se o
 * Supabase estiver em baixo.
 */
export interface ServiceCover {
  serviceId: string
  storageKey: string
  /**
   * O mesmo, a metade da largura. Nulo nas capas carregadas antes de isto
   * existir, e aí serve-se só a grande — que é o que já acontecia.
   */
  mediumKey: string | null
  /** Do ficheiro grande. É daqui que sai o descritor do `srcset`. */
  width: number | null
  height: number | null
  alt: string
  /** Recorte, como `object-position` do CSS. */
  pos: string
}

/**
 * Uma história: um casamento contado do princípio ao fim.
 *
 * O portfólio mostra que sabemos fotografar. Uma história mostra como é estar
 * connosco um dia inteiro, que é o que faz alguém escrever-nos.
 */
export interface Historia {
  id: string
  /** O que vai no endereço: /historias/ana-e-tiago. */
  slug: string
  title: string
  /** Por baixo do título, na capa. Normalmente o sítio e o mês. */
  subtitle: string | null
  eventDate: string | null
  intro: string | null
  /** A frase dos noivos. Vazia esconde o bloco: não se inventam elogios. */
  quote: string | null
  quoteAuthor: string | null
  coverKey: string | null
  coverMediumKey: string | null
  coverWidth: number | null
  coverHeight: number | null
  /** Recorte da capa, como `object-position` do CSS. */
  coverPos: string
  published: boolean
  sortOrder: number
}

/**
 * A largura com que uma fotografia entra na história.
 *
 * Três e não mais: é a única decisão de desenho que fica do lado de quem
 * escreve, e três valores que se percebem sem explicação valem mais do que uma
 * folha de estilos aberta ao engano. Dois blocos "par" seguidos ficam lado a
 * lado; um sozinho fica como um "grande".
 */
export type LarguraBloco = 'cheia' | 'grande' | 'par'

export interface BlocoHistoria {
  id: string
  storyId: string
  kind: 'foto' | 'texto'
  storageKey: string | null
  mediumKey: string | null
  thumbKey: string | null
  width: number | null
  height: number | null
  contentType: string | null
  pos: string
  alt: string
  texto: string | null
  largura: LarguraBloco
  sortOrder: number
}
