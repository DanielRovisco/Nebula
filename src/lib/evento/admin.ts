/**
 * O lado do painel: criar eventos, ver o que os convidados carregaram, moderar.
 *
 * Ao contrário do lado do convidado, aqui fala-se com o Supabase directamente.
 * Dá para isso porque as políticas RLS das tabelas `events` e `event_media`
 * amarram tudo ao dono do evento: um pedido sem sessão não vê linha nenhuma, e
 * um pedido com sessão vê só os eventos dele. A regra vive na base de dados,
 * onde não depende de o browser se portar bem.
 */
import { supabase } from '../gallery/config'
import { callAdmin } from '../gallery/api'

export interface Evento {
  id: string
  slug: string
  couple_name: string
  event_date: string
  reveal_at: string | null
  upload_window_ends_at: string
  retain_until: string | null
  guests_see_gallery: boolean
  moderation: boolean
  max_file_bytes: number
  max_total_bytes: number
  bytes_used: number
  download_token: string
  created_at: string
}

export interface MediaAdmin {
  id: string
  kind: 'foto' | 'video'
  storage_key: string
  thumb_key: string | null
  original_name: string | null
  content_type: string | null
  size_bytes: number
  uploaded_by_name: string | null
  status: 'pendente' | 'aprovado' | 'escondido'
  created_at: string
  /** Preenchidos depois, por `assinar`. */
  url?: string
  thumbUrl?: string
}

/** 90 dias é o que se promete por omissão, e o que se dá se ninguém mexer. */
export const JANELA_DIAS = 90

export const slugificar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, '-e-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

export async function listarEventos(): Promise<Evento[]> {
  const { data, error } = await supabase()
    .from('events')
    .select('*')
    .order('event_date', { ascending: false })
  if (error) throw error
  return (data ?? []) as Evento[]
}

export async function lerEvento(id: string): Promise<Evento> {
  const { data, error } = await supabase().from('events').select('*').eq('id', id).single()
  if (error) throw error
  return data as Evento
}

export async function criarEvento(campos: {
  couple_name: string
  slug: string
  event_date: string
  upload_window_ends_at: string
  moderation: boolean
  guests_see_gallery: boolean
  reveal_at: string | null
}): Promise<Evento> {
  const { data: sessao } = await supabase().auth.getUser()
  const { data, error } = await supabase()
    .from('events')
    .insert({ ...campos, owner_id: sessao.user!.id })
    .select('*')
    .single()
  if (error) throw error
  return data as Evento
}

export async function guardarEvento(id: string, campos: Partial<Evento>): Promise<void> {
  const { error } = await supabase()
    .from('events')
    .update({ ...campos, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function apagarEvento(id: string): Promise<void> {
  const { error } = await supabase().from('events').delete().eq('id', id)
  if (error) throw error
}

export async function listarMedia(eventId: string): Promise<MediaAdmin[]> {
  const { data, error } = await supabase()
    .from('event_media')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as MediaAdmin[]
}

/**
 * Põe URLs assinados nas linhas.
 *
 * Assina a miniatura quando existe, e o ficheiro grande só quando não existe.
 * Numa página com trezentas fotografias, assinar as trezentas em tamanho real
 * era mandar o painel descarregar gigabytes para mostrar uma grelha.
 */
export async function assinar(linhas: MediaAdmin[]): Promise<MediaAdmin[]> {
  if (!linhas.length) return linhas
  const chaves = linhas.map((l) => l.thumb_key ?? l.storage_key)
  const { urls } = await callAdmin<{ urls: string[] }>({ action: 'read-urls', keys: chaves })
  return linhas.map((l, i) => ({ ...l, thumbUrl: urls[i], url: urls[i] }))
}

export async function mudarEstado(ids: string[], status: MediaAdmin['status']): Promise<void> {
  if (!ids.length) return
  const { error } = await supabase().from('event_media').update({ status }).in('id', ids)
  if (error) throw error
}

/**
 * Apaga mesmo: o ficheiro do R2 e a linha da base de dados, por esta ordem.
 *
 * Se o R2 falhar, a linha fica — o que dá um ficheiro visível e uma tentativa
 * que se repete. Ao contrário, ficaria um ficheiro pago para sempre sem
 * ninguém a saber que ele existe.
 */
export async function apagarMedia(linhas: MediaAdmin[]): Promise<void> {
  const chaves = linhas.flatMap((l) => [l.storage_key, ...(l.thumb_key ? [l.thumb_key] : [])])
  await callAdmin({ action: 'delete', keys: chaves })
  const { error } = await supabase().from('event_media').delete().in('id', linhas.map((l) => l.id))
  if (error) throw error
}
