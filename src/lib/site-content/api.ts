import { DEMO, supabase } from '../gallery/config'
import { THUMB_EDGE, THUMB_QUALITY, callAdmin, putToR2, resize } from '../gallery/api'
import { DEMO_TESTIMONIAL } from './types'
import type { SiteCategory, SitePhoto, Testimonial } from './types'

export { publicUrl } from './public'

const rowToCategory = (r: Record<string, unknown>): SiteCategory => ({
  id: r.id as string,
  slug: r.slug as string,
  label: r.label as string,
  sortOrder: (r.sort_order as number) ?? 0,
})

const rowToPhoto = (r: Record<string, unknown>): SitePhoto => ({
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
  published: r.published !== false,
})

// ─── Administração ────────────────────────────────────────────────────────

// Versão de demonstração: tudo em memória, para o painel do site poder ser
// experimentado sem Supabase configurado.
const demoStore: {
  categories: SiteCategory[]
  photos: SitePhoto[]
  testimonials: Testimonial[]
} = {
  testimonials: [{ ...DEMO_TESTIMONIAL }],
  categories: [
    { id: 'c1', slug: 'casamentos', label: 'Casamentos', sortOrder: 1 },
    { id: 'c2', slug: 'maternidade', label: 'Maternidade', sortOrder: 2 },
    { id: 'c3', slug: 'eventos', label: 'Eventos', sortOrder: 3 },
  ],
  photos: [
    'palace-dome', 'forest-bride', 'hero-beach-dress', 'maternity-railway',
    'baby-balloons', 'editorial-purple',
  ].map((n, i) => ({
    id: `sp-${i}`,
    categoryId: ['c1', 'c1', 'c1', 'c2', 'c3', 'c3'][i],
    storageKey: `demo/${n}-1440.webp`,
    thumbKey: `demo/${n}-480.webp`,
    alt: n.replace(/-/g, ' '),
    width: 1440,
    height: 1920,
    tall: i === 0,
    pos: '50% 50%',
    contentType: 'image/jpeg',
    sortOrder: i,
    published: true,
  })),
}

const demoWait = (ms = 200) => new Promise((r) => setTimeout(r, ms))

const demoSiteAdmin = {
  async listCategories() {
    await demoWait()
    return [...demoStore.categories].sort((a, b) => a.sortOrder - b.sortOrder)
  },
  async createCategory(label: string, slug: string) {
    await demoWait()
    if (demoStore.categories.some((c) => c.slug === slug)) {
      throw new Error('Já existe uma categoria com esse código.')
    }
    demoStore.categories.push({ id: `c-${Date.now()}`, slug, label, sortOrder: 99 })
  },
  async updateCategory(id: string, label: string) {
    await demoWait()
    const c = demoStore.categories.find((x) => x.id === id)
    if (c) c.label = label
  },
  async deleteCategory(id: string) {
    await demoWait()
    demoStore.categories = demoStore.categories.filter((c) => c.id !== id)
    demoStore.photos.forEach((p) => p.categoryId === id && (p.categoryId = null))
  },
  async listPhotos() {
    await demoWait()
    return [...demoStore.photos].sort((a, b) => a.sortOrder - b.sortOrder)
  },
  async addPhoto() {
    await demoWait()
    throw new Error('O upload precisa do Supabase e do bucket público configurados.')
  },
  async updatePhoto(id: string, patch: Partial<SitePhoto>) {
    await demoWait(120)
    const p = demoStore.photos.find((x) => x.id === id)
    if (p) Object.assign(p, patch)
  },
  async deletePhoto(id: string) {
    await demoWait(120)
    demoStore.photos = demoStore.photos.filter((p) => p.id !== id)
  },
  async reorderPhotos(orderedIds: string[]) {
    orderedIds.forEach((id, i) => {
      const p = demoStore.photos.find((x) => x.id === id)
      if (p) p.sortOrder = i
    })
  },
  async listTestimonials() {
    await demoWait()
    return [...demoStore.testimonials].sort((a, b) => a.sortOrder - b.sortOrder)
  },
  async createTestimonial(t: Omit<Testimonial, 'id'>) {
    await demoWait(120)
    demoStore.testimonials.push({ ...t, id: `t-${Date.now()}` })
  },
  async updateTestimonial(id: string, patch: Partial<Testimonial>) {
    await demoWait(120)
    const t = demoStore.testimonials.find((x) => x.id === id)
    if (t) Object.assign(t, patch)
  },
  async deleteTestimonial(id: string) {
    await demoWait(120)
    demoStore.testimonials = demoStore.testimonials.filter((t) => t.id !== id)
  },
  async reorderTestimonials(orderedIds: string[]) {
    orderedIds.forEach((id, i) => {
      const t = demoStore.testimonials.find((x) => x.id === id)
      if (t) t.sortOrder = i
    })
  },
}

const realSiteAdmin = {
  async listCategories(): Promise<SiteCategory[]> {
    const { data, error } = await supabase().from('site_categories').select('*').order('sort_order')
    if (error) throw new Error(error.message)
    return (data ?? []).map(rowToCategory)
  },

  async createCategory(label: string, slug: string) {
    const { error } = await supabase()
      .from('site_categories')
      .insert({ label, slug, sort_order: Date.now() % 100000 })
    if (error) {
      throw new Error(error.code === '23505' ? 'Já existe uma categoria com esse código.' : error.message)
    }
  },

  async updateCategory(id: string, label: string) {
    const { error } = await supabase().from('site_categories').update({ label }).eq('id', id)
    if (error) throw new Error(error.message)
  },

  async deleteCategory(id: string) {
    // As fotos não desaparecem com a categoria: ficam sem categoria e o admin
    // reatribui-as. Apagar trabalho por engano é pior do que uma etiqueta a
    // faltar.
    const { error } = await supabase().from('site_categories').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  async listPhotos(): Promise<SitePhoto[]> {
    const { data, error } = await supabase().from('site_photos').select('*').order('sort_order')
    if (error) throw new Error(error.message)
    return (data ?? []).map(rowToPhoto)
  },

  async addPhoto(input: {
    storageKey: string
    thumbKey: string | null
    categoryId: string | null
    alt: string
    width: number | null
    height: number | null
    contentType: string | null
    sortOrder: number
  }) {
    const { error } = await supabase().from('site_photos').insert({
      storage_key: input.storageKey,
      thumb_key: input.thumbKey,
      category_id: input.categoryId,
      alt: input.alt,
      width: input.width,
      height: input.height,
      content_type: input.contentType,
      sort_order: input.sortOrder,
    })
    if (error) throw new Error(error.message)
  },

  async updatePhoto(
    id: string,
    patch: Partial<Pick<SitePhoto, 'categoryId' | 'alt' | 'tall' | 'pos' | 'published' | 'sortOrder'>>,
  ) {
    const update: Record<string, unknown> = {}
    if (patch.categoryId !== undefined) update.category_id = patch.categoryId
    if (patch.alt !== undefined) update.alt = patch.alt
    if (patch.tall !== undefined) update.tall = patch.tall
    if (patch.pos !== undefined) update.pos = patch.pos
    if (patch.published !== undefined) update.published = patch.published
    if (patch.sortOrder !== undefined) update.sort_order = patch.sortOrder
    const { error } = await supabase().from('site_photos').update(update).eq('id', id)
    if (error) throw new Error(error.message)
  },

  async deletePhoto(id: string) {
    const { error } = await supabase().from('site_photos').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  async reorderPhotos(orderedIds: string[]) {
    const sb = supabase()
    await Promise.all(
      orderedIds.map((id, i) => sb.from('site_photos').update({ sort_order: i }).eq('id', id)),
    )
  },

  /**
   * No painel queremos ver também os testemunhos por publicar, e o `fetch`
   * público filtra por published — daí ir pelo SDK, que já leva a sessão.
   */
  async listTestimonials(): Promise<Testimonial[]> {
    const { data, error } = await supabase()
      .from('site_testimonials')
      .select('*')
      .order('sort_order')
    if (error) throw new Error(error.message)
    return (data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      author: r.author as string,
      context: (r.context as string) ?? '',
      quote: r.quote as string,
      sortOrder: (r.sort_order as number) ?? 0,
      published: r.published !== false,
    }))
  },

  async createTestimonial(t: Omit<Testimonial, 'id'>) {
    const { error } = await supabase().from('site_testimonials').insert({
      author: t.author,
      context: t.context,
      quote: t.quote,
      sort_order: t.sortOrder,
      published: t.published,
    })
    if (error) throw new Error(error.message)
  },

  async updateTestimonial(id: string, patch: Partial<Testimonial>) {
    const row: Record<string, unknown> = {}
    if (patch.author !== undefined) row.author = patch.author
    if (patch.context !== undefined) row.context = patch.context
    if (patch.quote !== undefined) row.quote = patch.quote
    if (patch.published !== undefined) row.published = patch.published
    const { error } = await supabase().from('site_testimonials').update(row).eq('id', id)
    if (error) throw new Error(error.message)
  },

  async deleteTestimonial(id: string) {
    const { error } = await supabase().from('site_testimonials').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  async reorderTestimonials(orderedIds: string[]) {
    const sb = supabase()
    await Promise.all(
      orderedIds.map((id, i) => sb.from('site_testimonials').update({ sort_order: i }).eq('id', id)),
    )
  },
}

export const siteAdmin = DEMO ? demoSiteAdmin : realSiteAdmin

// ─── Upload de imagens do site ────────────────────────────────────────────

/**
 * Carrega uma imagem para o bucket público e devolve as chaves.
 *
 * As imagens do site são reduzidas mais do que as das galerias: numa página
 * de portfólio ninguém precisa de mais do que 1600px, e o que se poupa aqui
 * paga-se em tempo de carregamento a cada visita.
 */
export const SITE_EDGE = 1600

/**
 * Um fotograma do vídeo, para servir de miniatura.
 *
 * Sem isto a grelha do portfólio teria um retângulo preto onde devia estar a
 * imagem: um `<video>` sem poster não mostra nada até alguém carregar em play.
 * Procura-se um segundo lá para dentro — o primeiro fotograma é muitas vezes
 * preto, de um fade de entrada.
 */
async function posterDeVideo(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const url = URL.createObjectURL(file)
  try {
    const v = document.createElement('video')
    v.src = url
    v.muted = true
    v.playsInline = true
    v.preload = 'metadata'
    await new Promise<void>((ok, falha) => {
      v.onloadedmetadata = () => ok()
      v.onerror = () => falha(new Error('não foi possível ler o vídeo'))
    })
    await new Promise<void>((ok) => {
      v.onseeked = () => ok()
      v.currentTime = Math.min(1, (v.duration || 2) / 2)
    })
    const escala = Math.min(1, THUMB_EDGE / Math.max(v.videoWidth, v.videoHeight))
    const w = Math.round(v.videoWidth * escala)
    const h = Math.round(v.videoHeight * escala)
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    c.getContext('2d')!.drawImage(v, 0, 0, w, h)
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/webp', THUMB_QUALITY))
    if (!blob) throw new Error('não foi possível gerar a miniatura do vídeo')
    return { blob, width: v.videoWidth, height: v.videoHeight }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Vídeo do portfólio: sobe tal como está, com um fotograma por miniatura.
 *
 * Ao contrário das fotografias, não é recomprimido — recomprimir vídeo no
 * browser é lento e estraga-o. O tamanho do ficheiro é responsabilidade de
 * quem o exporta.
 */
export async function uploadSiteVideo(file: File) {
  const poster = await posterDeVideo(file)

  const a = await callAdmin<{ key: string; url: string }>({
    action: 'upload-url',
    bucket: 'public',
    galleryId: 'portfolio',
    fileName: file.name,
    contentType: file.type || 'video/mp4',
    kind: 'full',
  })
  await putToR2(a.url, file, file.type || 'video/mp4')

  const b = await callAdmin<{ key: string; url: string }>({
    action: 'upload-url',
    bucket: 'public',
    galleryId: 'portfolio',
    fileName: file.name.replace(/\.[^.]+$/, '.webp'),
    contentType: 'image/webp',
    kind: 'thumb',
  })
  await putToR2(b.url, poster.blob, 'image/webp')

  return {
    storageKey: a.key,
    thumbKey: b.key,
    width: poster.width,
    height: poster.height,
    contentType: file.type || 'video/mp4',
  }
}

export async function uploadSitePhoto(file: File) {
  const full = await resize(file, SITE_EDGE, 'image/webp', 0.82)
  const thumb = await resize(file, THUMB_EDGE, 'image/webp', THUMB_QUALITY)

  const a = await callAdmin<{ key: string; url: string }>({
    action: 'upload-url',
    bucket: 'public',
    galleryId: 'portfolio',
    fileName: file.name.replace(/\.[^.]+$/, '.webp'),
    contentType: 'image/webp',
    kind: 'full',
  })
  await putToR2(a.url, full.blob, 'image/webp')

  const b = await callAdmin<{ key: string; url: string }>({
    action: 'upload-url',
    bucket: 'public',
    galleryId: 'portfolio',
    fileName: file.name,
    contentType: 'image/webp',
    kind: 'thumb',
  })
  await putToR2(b.url, thumb.blob, 'image/webp')

  return {
    storageKey: a.key,
    thumbKey: b.key,
    width: full.width,
    height: full.height,
    contentType: 'image/webp',
  }
}
