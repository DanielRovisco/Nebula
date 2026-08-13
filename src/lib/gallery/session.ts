import type { GalleryAccess } from './types'

// Guarda o acesso já concedido para que um refresh não obrigue a reescrever a
// password. Vive em sessionStorage (morre com o separador) e nunca contém a
// password — só os URLs assinados, que expiram sozinhos.

const key = (slug: string) => `nebula-gallery-${slug}`

interface Stored {
  data: GalleryAccess
  expiresAt: number
}

export function saveSession(slug: string, data: GalleryAccess) {
  try {
    const stored: Stored = {
      data,
      // Margem de 60s para não entregar um URL que expira a meio do download.
      expiresAt: Date.now() + (data.expiresIn - 60) * 1000,
    }
    sessionStorage.setItem(key(slug), JSON.stringify(stored))
  } catch { /* sem sessionStorage a galeria funciona, só não sobrevive a refresh */ }
}

export function loadSession(slug: string): GalleryAccess | null {
  try {
    const raw = sessionStorage.getItem(key(slug))
    if (!raw) return null
    const stored = JSON.parse(raw) as Stored
    if (Date.now() > stored.expiresAt) {
      sessionStorage.removeItem(key(slug))
      return null
    }
    return stored.data
  } catch {
    return null
  }
}

export function clearSession(slug: string) {
  try {
    sessionStorage.removeItem(key(slug))
  } catch { /* nada a fazer */ }
}
