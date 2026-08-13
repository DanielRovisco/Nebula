import { DEMO, anonKey, functionsUrl, supabase } from './config'
import { demoApi } from './demo'
import type { Gallery, GalleryAccess, GalleryPatch, NewGallery, Photo } from './types'

const THUMB_WIDTH = 640
const THUMB_QUALITY = 0.78

/** Reduz uma imagem no browser, para a grelha não carregar ficheiros enormes. */
async function makeThumb(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, THUMB_WIDTH / bitmap.width)
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h)

  const blob = await new Promise<Blob | null>((res) =>
    canvas.toBlob(res, 'image/webp', THUMB_QUALITY),
  )
  const dims = { width: bitmap.width, height: bitmap.height }
  bitmap.close()
  if (!blob) throw new Error('Não foi possível gerar a miniatura.')
  return { blob, ...dims }
}

const rowToGallery = (r: Record<string, unknown>): Gallery => ({
  id: r.id as string,
  slug: r.slug as string,
  title: r.title as string,
  clientName: (r.client_name as string) ?? null,
  message: (r.message as string) ?? null,
  coverPath: (r.cover_path as string) ?? null,
  published: Boolean(r.published),
  downloadEnabled: Boolean(r.download_enabled),
  expiresAt: (r.expires_at as string) ?? null,
  createdAt: r.created_at as string,
})

const rowToPhoto = (r: Record<string, unknown>): Photo => ({
  id: r.id as string,
  galleryId: r.gallery_id as string,
  storagePath: r.storage_path as string,
  thumbPath: (r.thumb_path as string) ?? null,
  fileName: r.file_name as string,
  width: (r.width as number) ?? null,
  height: (r.height as number) ?? null,
  sizeBytes: (r.size_bytes as number) ?? null,
  sortOrder: (r.sort_order as number) ?? 0,
})

const realApi = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase().auth.signInWithPassword({ email, password })
    if (error) throw new Error('Credenciais inválidas.')
    return { email: data.user?.email ?? email }
  },

  async signOut() {
    await supabase().auth.signOut()
  },

  async currentUser() {
    const { data } = await supabase().auth.getSession()
    return data.session ? { email: data.session.user.email ?? '' } : null
  },

  async listGalleries(): Promise<Gallery[]> {
    const sb = supabase()
    const { data, error } = await sb
      .from('galleries_admin')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)

    // Contagem de fotos por galeria numa só ida à base de dados.
    const { data: counts } = await sb.from('photos').select('gallery_id')
    const tally = new Map<string, number>()
    for (const row of counts ?? []) {
      const id = (row as { gallery_id: string }).gallery_id
      tally.set(id, (tally.get(id) ?? 0) + 1)
    }

    return (data ?? []).map((r) => ({
      ...rowToGallery(r),
      photoCount: tally.get(r.id as string) ?? 0,
    }))
  },

  async getGallery(id: string): Promise<{ gallery: Gallery; photos: Photo[] }> {
    const sb = supabase()
    const [g, p] = await Promise.all([
      sb.from('galleries_admin').select('*').eq('id', id).single(),
      sb.from('photos').select('*').eq('gallery_id', id).order('sort_order'),
    ])
    if (g.error) throw new Error(g.error.message)
    if (p.error) throw new Error(p.error.message)
    return { gallery: rowToGallery(g.data), photos: (p.data ?? []).map(rowToPhoto) }
  },

  async createGallery(input: NewGallery): Promise<Gallery> {
    const sb = supabase()
    // password_hash é NOT NULL: entra um valor de arranque e é imediatamente
    // substituído pelo hash bcrypt calculado no servidor.
    const { data, error } = await sb
      .from('galleries')
      .insert({
        slug: input.slug,
        title: input.title,
        client_name: input.clientName || null,
        message: input.message || null,
        password_hash: 'pending',
        published: input.published ?? false,
        download_enabled: input.downloadEnabled ?? true,
        expires_at: input.expiresAt ?? null,
      })
      .select()
      .single()
    if (error) {
      throw new Error(
        error.code === '23505' ? 'Já existe uma galeria com esse código.' : error.message,
      )
    }
    const { error: pwError } = await sb.rpc('set_gallery_password', {
      gallery_id: data.id,
      new_password: input.password,
    })
    if (pwError) {
      // Sem password utilizável a galeria não serve para nada e ficaria com um
      // hash inválido — melhor não deixar lixo para trás.
      await sb.from('galleries').delete().eq('id', data.id)
      throw new Error('Não foi possível definir a password.')
    }
    return rowToGallery(data)
  },

  async updateGallery(id: string, patch: GalleryPatch): Promise<Gallery> {
    const sb = supabase()
    const update: Record<string, unknown> = {}
    if (patch.slug !== undefined) update.slug = patch.slug
    if (patch.title !== undefined) update.title = patch.title
    if (patch.clientName !== undefined) update.client_name = patch.clientName || null
    if (patch.message !== undefined) update.message = patch.message || null
    if (patch.published !== undefined) update.published = patch.published
    if (patch.downloadEnabled !== undefined) update.download_enabled = patch.downloadEnabled
    if (patch.expiresAt !== undefined) update.expires_at = patch.expiresAt

    if (Object.keys(update).length) {
      const { error } = await sb.from('galleries').update(update).eq('id', id)
      if (error) {
        throw new Error(
          error.code === '23505' ? 'Já existe uma galeria com esse código.' : error.message,
        )
      }
    }
    if (patch.password) {
      const { error } = await sb.rpc('set_gallery_password', {
        gallery_id: id,
        new_password: patch.password,
      })
      if (error) throw new Error('Não foi possível alterar a password.')
    }
    const { data, error } = await sb.from('galleries_admin').select('*').eq('id', id).single()
    if (error) throw new Error(error.message)
    return rowToGallery(data)
  },

  async deleteGallery(id: string) {
    const sb = supabase()
    // Apagar os ficheiros primeiro: a linha some por cascade e depois já não
    // saberíamos que caminhos limpar, deixando o storage a pagar por lixo.
    const { data: photos } = await sb.from('photos').select('storage_path, thumb_path').eq('gallery_id', id)
    const paths = (photos ?? []).flatMap((p) =>
      [p.storage_path, p.thumb_path].filter(Boolean) as string[],
    )
    if (paths.length) await sb.storage.from('galleries').remove(paths)
    const { error } = await sb.from('galleries').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  async uploadPhotos(galleryId: string, files: File[], onProgress: (done: number) => void) {
    const sb = supabase()
    const { data: existing } = await sb
      .from('photos')
      .select('sort_order')
      .eq('gallery_id', galleryId)
      .order('sort_order', { ascending: false })
      .limit(1)
    let order = ((existing?.[0]?.sort_order as number) ?? -1) + 1
    let done = 0

    for (const file of files) {
      const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const fullPath = `${galleryId}/${stamp}-${safe}`
      const thumbPath = `${galleryId}/thumbs/${stamp}.webp`

      const up = await sb.storage.from('galleries').upload(fullPath, file, {
        cacheControl: '3600',
        upsert: false,
      })
      if (up.error) throw new Error(`${file.name}: ${up.error.message}`)

      let width: number | null = null
      let height: number | null = null
      let storedThumb: string | null = null
      try {
        const thumb = await makeThumb(file)
        width = thumb.width
        height = thumb.height
        const t = await sb.storage.from('galleries').upload(thumbPath, thumb.blob, {
          contentType: 'image/webp',
          upsert: false,
        })
        if (!t.error) storedThumb = thumbPath
      } catch {
        // Sem miniatura a galeria ainda funciona (usa a foto inteira), por isso
        // uma falha aqui não deve abortar o upload.
      }

      const { error } = await sb.from('photos').insert({
        gallery_id: galleryId,
        storage_path: fullPath,
        thumb_path: storedThumb,
        file_name: file.name,
        width,
        height,
        size_bytes: file.size,
        sort_order: order++,
      })
      if (error) throw new Error(`${file.name}: ${error.message}`)
      onProgress(++done)
    }
  },

  async deletePhoto(photoId: string) {
    const sb = supabase()
    const { data } = await sb
      .from('photos')
      .select('storage_path, thumb_path')
      .eq('id', photoId)
      .single()
    if (data) {
      const paths = [data.storage_path, data.thumb_path].filter(Boolean) as string[]
      if (paths.length) await sb.storage.from('galleries').remove(paths)
    }
    const { error } = await sb.from('photos').delete().eq('id', photoId)
    if (error) throw new Error(error.message)
  },

  async reorderPhotos(_galleryId: string, orderedIds: string[]) {
    const sb = supabase()
    await Promise.all(
      orderedIds.map((id, i) => sb.from('photos').update({ sort_order: i }).eq('id', id)),
    )
  },

  async access(slug: string, password: string): Promise<GalleryAccess> {
    const res = await fetch(functionsUrl('gallery-access'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        // A Edge Function corre sem verificação de JWT, mas o gateway do
        // Supabase continua a exigir a apikey.
        apikey: anonKey(),
        Authorization: `Bearer ${anonKey()}`,
      },
      body: JSON.stringify({ slug, password }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error === 'invalid_credentials' ? 'invalid_credentials' : 'server_error')
    }
    return res.json()
  },
}

export const api = DEMO ? demoApi : realApi
export type GalleryApi = typeof realApi
