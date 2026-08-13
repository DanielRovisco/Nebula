import type { Gallery, GalleryAccess, GalleryPatch, NewGallery, Photo } from './types'
import { asset } from '../asset'

// Dados de demonstração: usam as fotos do próprio portfólio, que já estão no
// site. Vivem em memória (com persistência em sessionStorage para sobreviver a
// recargas) e desaparecem ao fechar o separador.

const DEMO_PHOTOS = [
  'palace-dome', 'forest-bride', 'hero-beach-dress', 'editorial-lake',
  'editorial-autumn', 'editorial-purple', 'maternity-railway',
  'maternity-sunset-couple', 'gender-reveal-beach', 'baby-balloons',
  'editorial-studio-1', 'editorial-studio-2', 'editorial-dramatic',
  'editorial-blue-dress',
]

const KEY = 'nebula-demo-galleries'

interface DemoState {
  galleries: (Gallery & { password: string })[]
  photos: Photo[]
}

function seed(): DemoState {
  const galleries: (Gallery & { password: string })[] = [
    {
      id: 'demo-1',
      slug: 'ana-e-tiago',
      title: 'Ana & Tiago',
      clientName: 'Ana Ferreira',
      message: 'As primeiras 14 do vosso dia. O resto segue durante a semana.',
      coverPath: null,
      published: true,
      downloadEnabled: true,
      expiresAt: null,
      createdAt: new Date(Date.now() - 864e5 * 3).toISOString(),
      password: 'demo',
    },
    {
      id: 'demo-2',
      slug: 'maternidade-rita',
      title: 'Maternidade — Rita',
      clientName: 'Rita Sousa',
      message: null,
      coverPath: null,
      published: false,
      downloadEnabled: true,
      expiresAt: null,
      createdAt: new Date(Date.now() - 864e5 * 12).toISOString(),
      password: 'demo',
    },
  ]
  const photos: Photo[] = DEMO_PHOTOS.map((name, i) => ({
    id: `p-${i}`,
    galleryId: 'demo-1',
    storagePath: asset(`/brand/portfolio/${name}-1440.webp`),
    thumbPath: asset(`/brand/portfolio/${name}-480.webp`),
    fileName: `${name}.jpg`,
    width: 1440,
    height: 1920,
    sizeBytes: 420_000,
    sortOrder: i,
  }))
  return { galleries, photos }
}

function load(): DemoState {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* sessionStorage indisponível — segue com dados novos */ }
  const s = seed()
  save(s)
  return s
}

function save(s: DemoState) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(s))
  } catch { /* ignora: a demo continua a funcionar só em memória */ }
}

const wait = (ms = 260) => new Promise((r) => setTimeout(r, ms))
// A password nunca sai desta camada, tal como no backend real.
const strip = ({ password, ...rest }: Gallery & { password: string }): Gallery => {
  void password
  return rest
}

export const demoApi = {
  async signIn(email: string, password: string) {
    await wait()
    if (password.length < 3) throw new Error('Credenciais inválidas.')
    return { email }
  },
  async signOut() {
    await wait(80)
  },
  async currentUser() {
    return sessionStorage.getItem('nebula-demo-admin') ? { email: 'demo@nebula.pt' } : null
  },

  async listGalleries(): Promise<Gallery[]> {
    await wait()
    const s = load()
    return s.galleries
      .map(strip)
      .map((g) => ({ ...g, photoCount: s.photos.filter((p) => p.galleryId === g.id).length }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  async getGallery(id: string): Promise<{ gallery: Gallery; photos: Photo[] }> {
    await wait()
    const s = load()
    const g = s.galleries.find((x) => x.id === id)
    if (!g) throw new Error('Galeria não encontrada.')
    return {
      gallery: strip(g),
      photos: s.photos.filter((p) => p.galleryId === id).sort((a, b) => a.sortOrder - b.sortOrder),
    }
  },

  async createGallery(input: NewGallery): Promise<Gallery> {
    await wait()
    const s = load()
    if (s.galleries.some((g) => g.slug === input.slug)) {
      throw new Error('Já existe uma galeria com esse código.')
    }
    const g = {
      id: `demo-${Date.now()}`,
      slug: input.slug,
      title: input.title,
      clientName: input.clientName ?? null,
      message: input.message ?? null,
      coverPath: null,
      published: input.published ?? false,
      downloadEnabled: input.downloadEnabled ?? true,
      expiresAt: input.expiresAt ?? null,
      createdAt: new Date().toISOString(),
      password: input.password,
    }
    s.galleries.push(g)
    save(s)
    return strip(g)
  },

  async updateGallery(id: string, patch: GalleryPatch): Promise<Gallery> {
    await wait()
    const s = load()
    const g = s.galleries.find((x) => x.id === id)
    if (!g) throw new Error('Galeria não encontrada.')
    Object.assign(g, {
      ...(patch.slug !== undefined && { slug: patch.slug }),
      ...(patch.title !== undefined && { title: patch.title }),
      ...(patch.clientName !== undefined && { clientName: patch.clientName || null }),
      ...(patch.message !== undefined && { message: patch.message || null }),
      ...(patch.published !== undefined && { published: patch.published }),
      ...(patch.downloadEnabled !== undefined && { downloadEnabled: patch.downloadEnabled }),
      ...(patch.expiresAt !== undefined && { expiresAt: patch.expiresAt }),
      ...(patch.password && { password: patch.password }),
    })
    save(s)
    return strip(g)
  },

  async deleteGallery(id: string) {
    await wait()
    const s = load()
    s.galleries = s.galleries.filter((g) => g.id !== id)
    s.photos = s.photos.filter((p) => p.galleryId !== id)
    save(s)
  },

  async uploadPhotos(
    galleryId: string,
    files: File[],
    onProgress: (done: number) => void,
    _options: { maxEdge?: number | null } = {},
  ) {
    void _options
    const s = load()
    let done = 0
    for (const file of files) {
      await wait(160)
      const url = URL.createObjectURL(file)
      s.photos.push({
        id: `p-${Date.now()}-${done}`,
        galleryId,
        storagePath: url,
        thumbPath: url,
        fileName: file.name,
        width: null,
        height: null,
        sizeBytes: file.size,
        sortOrder: s.photos.filter((p) => p.galleryId === galleryId).length,
      })
      onProgress(++done)
    }
    save(s)
  },

  async deletePhoto(photoId: string) {
    await wait(120)
    const s = load()
    s.photos = s.photos.filter((p) => p.id !== photoId)
    save(s)
  },

  async reorderPhotos(galleryId: string, orderedIds: string[]) {
    const s = load()
    orderedIds.forEach((id, i) => {
      const p = s.photos.find((x) => x.id === id && x.galleryId === galleryId)
      if (p) p.sortOrder = i
    })
    save(s)
  },

  async access(slug: string, password: string): Promise<GalleryAccess> {
    await wait(500)
    const s = load()
    const g = s.galleries.find((x) => x.slug === slug && x.published && x.password === password)
    if (!g) throw new Error('invalid_credentials')
    return {
      gallery: {
        id: g.id,
        slug: g.slug,
        title: g.title,
        clientName: g.clientName,
        message: g.message,
        downloadEnabled: g.downloadEnabled,
      },
      expiresIn: 7200,
      photos: s.photos
        .filter((p) => p.galleryId === g.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((p) => ({
          id: p.id,
          fileName: p.fileName,
          width: p.width,
          height: p.height,
          sizeBytes: p.sizeBytes,
          url: p.storagePath,
          thumbUrl: p.thumbPath,
        })),
    }
  },
}
