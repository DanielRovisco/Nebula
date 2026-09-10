/**
 * O painel dos noivos fala com uma única Edge Function, e leva sempre a chave.
 *
 * Não há sessão nem token de autenticação: a chave é o que autoriza, e vem do
 * link que o fotógrafo lhes entregou. Fica guardada no browser depois da
 * primeira visita, para eles poderem pôr a página nos favoritos sem o segredo
 * ficar à vista na barra de endereço.
 */
import { anonKey, functionsUrl } from '../gallery/config'

export type EstadoMedia = 'pendente' | 'aprovado' | 'escondido'

export interface MediaNoivos {
  id: string
  kind: 'foto' | 'video'
  nome: string | null
  contentType: string | null
  bytes: number
  width: number | null
  height: number | null
  takenAt: string | null
  autor: string | null
  status: EstadoMedia
  createdAt: string
  thumbUrl: string | null
  url: string
}

export interface Painel {
  evento: {
    slug: string
    coupleName: string
    eventDate: string
    revealAt: string | null
    uploadWindowEndsAt: string
    guestsSeeGallery: boolean
    moderation: boolean
    bytesUsed: number
    maxTotalBytes: number
  }
  pessoas: number
  media: MediaNoivos[]
  expiresIn: number
}

export class SemAcesso extends Error {}

const CHAVE = (slug: string) => `nebula-noivos-${slug}`

export const guardarChave = (slug: string, chave: string) => {
  try { localStorage.setItem(CHAVE(slug), chave) } catch { /* modo privado */ }
}

export const lerChave = (slug: string): string | null => {
  try { return localStorage.getItem(CHAVE(slug)) } catch { return null }
}

export const esquecerChave = (slug: string) => {
  try { localStorage.removeItem(CHAVE(slug)) } catch { /* nada a fazer */ }
}

async function chamar<T>(corpo: Record<string, unknown>): Promise<T> {
  const res = await fetch(functionsUrl('event-owner'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: anonKey() },
    body: JSON.stringify(corpo),
    cache: 'no-store',
  })
  if (res.status === 401) throw new SemAcesso()
  if (!res.ok) throw new Error('falhou')
  return res.json() as Promise<T>
}

export const lerPainel = (slug: string, chave: string) =>
  chamar<Painel>({ action: 'painel', slug, chave })

export const mudarEstado = (slug: string, chave: string, ids: string[], status: EstadoMedia) =>
  chamar<{ ok: true }>({ action: 'estado', slug, chave, ids, status })

export const apagarMedia = (slug: string, chave: string, ids: string[]) =>
  chamar<{ ok: true; apagados: number }>({ action: 'apagar', slug, chave, ids })

export const guardarDefinicoes = (
  slug: string,
  chave: string,
  campos: { guestsSeeGallery?: boolean; moderation?: boolean; revealAt?: string | null },
) => chamar<{ ok: true }>({ action: 'definicoes', slug, chave, ...campos })

/** Formatação de tamanhos, do quilobyte ao terabyte, sem exagerar em casas. */
export function tamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const unidades = ['KB', 'MB', 'GB', 'TB']
  let v = bytes / 1024
  let i = 0
  while (v >= 1024 && i < unidades.length - 1) { v /= 1024; i++ }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${unidades[i]}`
}
