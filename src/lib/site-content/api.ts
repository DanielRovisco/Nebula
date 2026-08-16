import { DEMO, supabase } from '../gallery/config'
import { THUMB_EDGE, THUMB_QUALITY, callAdmin, putToR2, resize } from '../gallery/api'
import type { SiteCategory, SitePhoto } from './types'

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
  sortOrder: (r.sort_order as number) ?? 0,
  published: r.published !== false,
})

// ─── Administração ────────────────────────────────────────────────────────

// Versão de demonstração: tudo em memória, para o painel do site poder ser
// experimentado sem Supabase configurado.
const demoStore: { categories: SiteCategory[]; photos: SitePhoto[] } = {
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
    sortOrder: number
  }) {
    const { error } = await supabase().from('site_photos').insert({
      storage_key: input.storageKey,
      thumb_key: input.thumbKey,
      category_id: input.categoryId,
      alt: input.alt,
      width: input.width,
      height: input.height,
      sort_order: input.sortOrder,
    })
    if (error) throw new Error(error.message)
  },

  async updatePhoto(
    id: string,
    patch: Partial<Pick<SitePhoto, 'categoryId' | 'alt' | 'tall' | 'published' | 'sortOrder'>>,
  ) {
    const update: Record<string, unknown> = {}
    if (patch.categoryId !== undefined) update.category_id = patch.categoryId
    if (patch.alt !== undefined) update.alt = patch.alt
    if (patch.tall !== undefined) update.tall = patch.tall
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
  }
}
