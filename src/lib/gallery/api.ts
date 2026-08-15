import { DEMO, anonKey, functionsUrl, supabase } from './config'
import { demoApi } from './demo'
import type { Gallery, GalleryAccess, GalleryEvent, GalleryPatch, NewGallery, Photo } from './types'

const THUMB_EDGE = 640
const THUMB_QUALITY = 0.78

/** Lado maior a que as fotos são reduzidas quando a redução está ligada. */
export const DELIVERY_EDGE = 3000
const DELIVERY_QUALITY = 0.88

interface Resized {
  blob: Blob
  width: number
  height: number
  /** Dimensões do ficheiro original, antes de qualquer redução. */
  originalWidth: number
  originalHeight: number
}

/**
 * Reduz uma imagem no browser. Serve para dois fins: a miniatura da grelha e,
 * opcionalmente, a própria foto de entrega — um JPEG de 3000px no lado maior
 * ocupa 3 a 5 vezes menos do que o original da máquina, sem diferença visível
 * numa galeria de cliente, e é o que faz 10 GB chegarem para uma temporada.
 */
async function resize(
  file: File,
  maxEdge: number,
  mime: string,
  quality: number,
): Promise<Resized> {
  const bitmap = await createImageBitmap(file)
  const { width: ow, height: oh } = bitmap
  const scale = Math.min(1, maxEdge / Math.max(ow, oh))
  const w = Math.round(ow * scale)
  const h = Math.round(oh * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, mime, quality))
  if (!blob) throw new Error('Não foi possível processar a imagem.')
  return { blob, width: w, height: h, originalWidth: ow, originalHeight: oh }
}

/** Chama uma Edge Function com o token da sessão do admin. */
async function callAdmin<T>(body: Record<string, unknown>): Promise<T> {
  const { data } = await supabase().auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Sessão expirada. Volta a entrar.')

  const res = await fetch(functionsUrl('admin-storage'), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: anonKey(),
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error === 'unauthorized' ? 'Sessão expirada. Volta a entrar.' : 'Falha no storage.')
  }
  return res.json()
}

/** Envia um blob para o R2 usando um PUT pré-assinado. */
async function putToR2(url: string, blob: Blob, contentType: string) {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'content-type': contentType },
    body: blob,
  })
  if (!res.ok) throw new Error(`O upload falhou (${res.status}).`)
}

/**
 * Miniatura de um vídeo: carrega-o em memória, salta para um fotograma com
 * conteúdo (o primeiro costuma ser preto) e desenha-o para um canvas.
 */
async function videoThumb(file: File): Promise<Resized> {
  const url = URL.createObjectURL(file)
  try {
    const video = document.createElement('video')
    video.src = url
    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'

    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve()
      video.onerror = () => reject(new Error('Vídeo ilegível.'))
      setTimeout(() => reject(new Error('Vídeo demorou demasiado.')), 15000)
    })

    // Um segundo dentro, ou a meio se for muito curto.
    video.currentTime = Math.min(1, (video.duration || 2) / 2)
    await new Promise<void>((resolve, reject) => {
      video.onseeked = () => resolve()
      video.onerror = () => reject(new Error('Não foi possível avançar o vídeo.'))
      setTimeout(() => resolve(), 5000)
    })

    const ow = video.videoWidth
    const oh = video.videoHeight
    const scale = Math.min(1, THUMB_EDGE / Math.max(ow, oh))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(ow * scale)
    canvas.height = Math.round(oh * scale)
    canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, 'image/webp', THUMB_QUALITY),
    )
    if (!blob) throw new Error('Não foi possível gerar a miniatura do vídeo.')
    return {
      blob,
      width: canvas.width,
      height: canvas.height,
      originalWidth: ow,
      originalHeight: oh,
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}

const rowToGallery = (r: Record<string, unknown>): Gallery => ({
  id: r.id as string,
  slug: r.slug as string,
  title: r.title as string,
  clientName: (r.client_name as string) ?? null,
  message: (r.message as string) ?? null,
  coverPath: (r.cover_path as string) ?? null,
  coverPhotoId: (r.cover_photo_id as string) ?? null,
  coverTitle: (r.cover_title as string) ?? null,
  coverFont: ((r.cover_font as string) ?? 'serif') as Gallery['coverFont'],
  logoVariant: ((r.logo_variant as string) ?? 'white') as Gallery['logoVariant'],
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
  contentType: (r.content_type as string) ?? null,
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
        cover_title: input.coverTitle ?? null,
        cover_font: input.coverFont ?? 'serif',
        logo_variant: input.logoVariant ?? 'white',
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
    if (patch.coverPhotoId !== undefined) update.cover_photo_id = patch.coverPhotoId
    if (patch.coverTitle !== undefined) update.cover_title = patch.coverTitle || null
    if (patch.coverFont !== undefined) update.cover_font = patch.coverFont
    if (patch.logoVariant !== undefined) update.logo_variant = patch.logoVariant

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
    if (paths.length) await callAdmin({ action: 'delete', keys: paths })
    const { error } = await sb.from('galleries').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  async uploadPhotos(
    galleryId: string,
    files: File[],
    onProgress: (done: number) => void,
    options: { maxEdge?: number | null } = {},
  ) {
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
      const video = file.type.startsWith('video/')

      // A foto de entrega: reduzida se pedido, senão o ficheiro tal e qual.
      // Vídeos sobem sempre intactos — recodificar vídeo no browser não é
      // viável, e reduzir um vídeo não é coisa que se faça sem o dono ver.
      let payload: Blob = file
      let contentType = file.type || (video ? 'video/mp4' : 'image/jpeg')
      let width: number | null = null
      let height: number | null = null

      if (options.maxEdge && !video) {
        try {
          const r = await resize(file, options.maxEdge, 'image/jpeg', DELIVERY_QUALITY)
          // Só vale a pena se realmente encolher — um ficheiro já pequeno pode
          // até crescer ao ser recomprimido.
          if (r.blob.size < file.size) {
            payload = r.blob
            contentType = 'image/jpeg'
            width = r.width
            height = r.height
          } else {
            width = r.originalWidth
            height = r.originalHeight
          }
        } catch {
          // Formato que o browser não sabe descodificar: sobe o original.
        }
      }

      const full = await callAdmin<{ key: string; url: string }>({
        action: 'upload-url',
        galleryId,
        fileName: file.name,
        contentType,
        kind: 'full',
      })
      await putToR2(full.url, payload, contentType)

      let storedThumb: string | null = null
      try {
        const thumb = video
          ? await videoThumb(file)
          : await resize(file, THUMB_EDGE, 'image/webp', THUMB_QUALITY)
        if (width === null) {
          width = thumb.originalWidth
          height = thumb.originalHeight
        }
        const t = await callAdmin<{ key: string; url: string }>({
          action: 'upload-url',
          galleryId,
          fileName: file.name,
          contentType: 'image/webp',
          kind: 'thumb',
        })
        await putToR2(t.url, thumb.blob, 'image/webp')
        storedThumb = t.key
      } catch {
        // Sem miniatura a galeria ainda funciona (usa a foto inteira), por isso
        // uma falha aqui não deve abortar o upload.
      }

      const { error } = await sb.from('photos').insert({
        gallery_id: galleryId,
        storage_path: full.key,
        thumb_path: storedThumb,
        file_name: file.name,
        content_type: contentType,
        width,
        height,
        size_bytes: payload.size,
        sort_order: order++,
      })
      if (error) {
        // A linha não entrou: os objetos já no R2 ficariam órfãos a ocupar
        // espaço que ninguém consegue ver nem apagar pela interface.
        await callAdmin({
          action: 'delete',
          keys: [full.key, storedThumb].filter(Boolean) as string[],
        }).catch(() => {})
        throw new Error(`${file.name}: ${error.message}`)
      }
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
      if (paths.length) await callAdmin({ action: 'delete', keys: paths })
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

  async listEvents(galleryId: string, limit = 60): Promise<GalleryEvent[]> {
    const { data, error } = await supabase()
      .from('gallery_events')
      .select('id, kind, file_name, at')
      .eq('gallery_id', galleryId)
      .order('at', { ascending: false })
      .limit(limit)
    if (error) throw new Error(error.message)
    return (data ?? []).map((r) => ({
      id: r.id as number,
      kind: r.kind as GalleryEvent['kind'],
      fileName: (r.file_name as string) ?? null,
      at: r.at as string,
    }))
  },

  async logEvent(token: string, body: Record<string, unknown>) {
    // Best-effort: o registo nunca deve estragar o download do cliente.
    try {
      await fetch(functionsUrl('gallery-log'), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          apikey: anonKey(),
          Authorization: `Bearer ${anonKey()}`,
        },
        body: JSON.stringify({ token, ...body }),
      })
    } catch { /* ignora */ }
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
