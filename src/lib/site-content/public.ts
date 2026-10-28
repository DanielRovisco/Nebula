import type {
  BlocoHistoria, Historia, LarguraBloco, ServiceCover, SiteCategory, SitePhoto, Testimonial,
} from './types'

/**
 * Leitura do conteúdo público do site.
 *
 * Fala com o PostgREST do Supabase por `fetch` simples, de propósito: importar
 * o SDK aqui arrastava 215 kB de JavaScript para dentro da página de portfólio,
 * que é uma página de marketing onde cada quilobyte conta. O SDK fica reservado
 * ao painel.
 */

const URL_ = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '')
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const PUBLIC_BASE = (import.meta.env.VITE_R2_PUBLIC_URL as string | undefined)?.replace(/\/$/, '')
const DEMO = import.meta.env.VITE_DEMO_GALLERIES === 'true'

export const publicUrl = (key: string) => (PUBLIC_BASE ? `${PUBLIC_BASE}/${key}` : '')

async function rest<T>(path: string): Promise<T | null> {
  if (!URL_ || !ANON) return null
  try {
    const res = await fetch(`${URL_}/rest/v1/${path}`, {
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

/**
 * Devolve `null` quando não há nada configurado, não há fotos carregadas, ou a
 * leitura falha — quem chama trata isso como "usa o conteúdo do código". É o
 * que impede o portfólio de aparecer vazio se o Supabase estiver a dormir.
 */
export async function fetchPortfolio(): Promise<{
  categories: SiteCategory[]
  photos: SitePhoto[]
} | null> {
  if (DEMO || !PUBLIC_BASE) return null

  const [cats, pics] = await Promise.all([
    rest<Record<string, unknown>[]>('site_categories?select=*&order=sort_order'),
    rest<Record<string, unknown>[]>('site_photos?select=*&published=eq.true&order=sort_order'),
  ])
  if (!cats || !pics || pics.length === 0) return null

  return {
    categories: cats.map((r) => ({
      id: r.id as string,
      slug: r.slug as string,
      label: r.label as string,
      sortOrder: (r.sort_order as number) ?? 0,
    })),
    photos: pics.map((r) => ({
      id: r.id as string,
      categoryId: (r.category_id as string) ?? null,
      storageKey: r.storage_key as string,
      thumbKey: (r.thumb_key as string) ?? null,
      alt: (r.alt as string) ?? '',
      width: (r.width as number) ?? null,
      height: (r.height as number) ?? null,
      tall: Boolean(r.tall),
      pos: (r.pos as string) || '50% 50%',
      contentType: (r.content_type as string) ?? null,
      sortOrder: (r.sort_order as number) ?? 0,
      published: true,
    })),
  }
}

/**
 * Testemunhos publicados, na ordem definida no painel.
 *
 * Devolve lista vazia quando não há nada configurado ou a leitura falha — e a
 * secção do site simplesmente não aparece. Continua a não haver elogios
 * inventados por nós em lado nenhum.
 *
 * Em demonstração não devolve nada, e a secção desaparece. Chegou a devolver
 * um cartão de exemplo, mas isso obrigava a importar o texto dele para aqui —
 * e este ficheiro entra no pacote principal, ou seja, o exemplo passava a
 * viajar para o browser de toda a gente só para nunca ser usado. A
 * demonstração serve para explorar as galerias e o painel; os testemunhos não
 * fazem falta nenhuma lá.
 */
export async function fetchTestimonials(): Promise<Testimonial[]> {
  if (DEMO) return []
  const rows = await rest<Record<string, unknown>[]>(
    'site_testimonials?select=*&published=eq.true&order=sort_order',
  )
  if (!rows) return []
  return rows.map((r) => ({
    id: r.id as string,
    author: r.author as string,
    context: (r.context as string) ?? '',
    quote: r.quote as string,
    sortOrder: (r.sort_order as number) ?? 0,
    published: true,
  }))
}

/**
 * Capas dos serviços escolhidas no painel, por serviço.
 *
 * Devolve um objeto vazio quando não há nada configurado ou a leitura falha,
 * e nunca `null`: quem chama junta-o ao que vem do código, e um serviço sem
 * capa carregada fica simplesmente com a fotografia do repositório.
 */
export async function fetchServiceCovers(): Promise<Record<string, ServiceCover>> {
  if (DEMO || !PUBLIC_BASE) return {}
  const linhas = await rest<Record<string, unknown>[]>('site_service_covers?select=*')
  if (!linhas) return {}
  const mapa: Record<string, ServiceCover> = {}
  for (const r of linhas) {
    mapa[String(r.service_id)] = {
      serviceId: String(r.service_id),
      storageKey: String(r.storage_key),
      mediumKey: r.medium_key ? String(r.medium_key) : null,
      width: r.width ? Number(r.width) : null,
      height: r.height ? Number(r.height) : null,
      alt: String(r.alt ?? ''),
      pos: String(r.pos ?? '50% 50%'),
    }
  }
  return mapa
}

/** Uma linha da tabela das histórias, como ela chega do PostgREST. */
const linhaParaHistoria = (r: Record<string, unknown>): Historia => ({
  id: r.id as string,
  slug: r.slug as string,
  title: r.title as string,
  subtitle: (r.subtitle as string) ?? null,
  eventDate: (r.event_date as string) ?? null,
  intro: (r.intro as string) ?? null,
  quote: (r.quote as string) ?? null,
  quoteAuthor: (r.quote_author as string) ?? null,
  coverKey: (r.cover_key as string) ?? null,
  coverMediumKey: (r.cover_medium_key as string) ?? null,
  coverWidth: (r.cover_width as number) ?? null,
  coverHeight: (r.cover_height as number) ?? null,
  coverPos: (r.cover_pos as string) || '50% 50%',
  published: Boolean(r.published),
  sortOrder: (r.sort_order as number) ?? 0,
})

const linhaParaBloco = (r: Record<string, unknown>): BlocoHistoria => ({
  id: r.id as string,
  storyId: r.story_id as string,
  kind: (r.kind as string) === 'texto' ? 'texto' : 'foto',
  storageKey: (r.storage_key as string) ?? null,
  mediumKey: (r.medium_key as string) ?? null,
  thumbKey: (r.thumb_key as string) ?? null,
  width: (r.width as number) ?? null,
  height: (r.height as number) ?? null,
  contentType: (r.content_type as string) ?? null,
  pos: (r.pos as string) || '50% 50%',
  alt: (r.alt as string) ?? '',
  texto: (r.texto as string) ?? null,
  largura: ((r.largura as string) || 'grande') as LarguraBloco,
  sortOrder: (r.sort_order as number) ?? 0,
})

/**
 * As histórias publicadas, para a página que as lista.
 *
 * Sem capa não entra: uma história sem capa na lista é um retângulo vazio com
 * um nome em cima, e isso estraga a página inteira. No painel ela continua lá,
 * à espera de uma.
 */
export async function fetchHistorias(): Promise<Historia[]> {
  if (DEMO || !PUBLIC_BASE) return []
  const linhas = await rest<Record<string, unknown>[]>(
    'site_stories?select=*&published=eq.true&order=sort_order',
  )
  if (!linhas) return []
  return linhas.map(linhaParaHistoria).filter((h) => h.coverKey)
}

/**
 * Uma história e os blocos dela, numa ida só.
 *
 * Devolve nulo quando não existe, quando ainda não está publicada ou quando a
 * leitura falha — e a página mostra "não encontrámos", que é verdade nos três
 * casos para quem está do outro lado.
 */
export async function fetchHistoria(
  slug: string,
): Promise<{ historia: Historia; blocos: BlocoHistoria[] } | null> {
  if (DEMO || !PUBLIC_BASE) return null
  const linhas = await rest<Record<string, unknown>[]>(
    `site_stories?select=*,site_story_blocks(*)&slug=eq.${encodeURIComponent(slug)}`
      + '&published=eq.true&limit=1',
  )
  if (!linhas?.length) return null
  const bruta = linhas[0]
  const blocos = ((bruta.site_story_blocks as Record<string, unknown>[]) ?? [])
    .map(linhaParaBloco)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  return { historia: linhaParaHistoria(bruta), blocos }
}
