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
  /** Está no lixo. Continua guardada, mas fora da vista de toda a gente. */
  apagada: boolean
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
    welcomeMessage: string
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

/** Manda para o lixo. Reversível. */
export const apagarMedia = (slug: string, chave: string, ids: string[]) =>
  chamar<{ ok: true; apagados: number }>({ action: 'apagar', slug, chave, ids })

/** Traz de volta do lixo. */
export const restaurarMedia = (slug: string, chave: string, ids: string[]) =>
  chamar<{ ok: true; restaurados: number }>({ action: 'restaurar', slug, chave, ids })

/** Apaga mesmo, e só o que já está no lixo. Sem volta. */
export const purgarMedia = (slug: string, chave: string, ids: string[]) =>
  chamar<{ ok: true; purgados: number }>({ action: 'purgar', slug, chave, ids })

export const guardarDefinicoes = (
  slug: string,
  chave: string,
  campos: {
    guestsSeeGallery?: boolean
    moderation?: boolean
    revealAt?: string | null
    /** Nula ou vazia repõe a frase de sempre. */
    welcomeMessage?: string | null
  },
) => chamar<{ ok: true }>({ action: 'definicoes', slug, chave, ...campos })
