// Edge Function: o painel dos noivos.
//
//   { action: 'painel', slug, chave }
//     → tudo o que o painel precisa: o evento, as definições, as contas e
//       todas as fotografias com URLs assinados, incluindo as que estão à
//       espera de aprovação e as escondidas.
//
//   { action: 'estado', slug, chave, ids, status }
//   { action: 'apagar', slug, chave, ids }
//   { action: 'definicoes', slug, chave, ... }
//
// Deploy: supabase functions deploy event-owner --no-verify-jwt
//
// ─────────────────────────────────────────────────────────────────────────────
// Os noivos não têm conta, pela mesma razão que os convidados não têm: obrigar
// duas pessoas a inventar uma palavra-passe para verem as fotografias do
// próprio casamento é trabalho que ninguém quer e um suporte que alguém vai ter
// de dar às onze da noite. O que autoriza é uma chave secreta no link, a mesma
// que autoriza o download em bloco.
//
// A chave nunca aparece do lado dos convidados. O link deles leva só o slug.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { cors, deleteObjects, json, presign } from '../_shared/r2.ts'

const VER_TTL = 60 * 60 * 4 // 4h: o casal fica a olhar para isto muito tempo

/**
 * A frase de omissão da página dos convidados.
 *
 * É a mesma que está como `default` da coluna, e está escrita nos dois sítios
 * de propósito: a coluna trata dos eventos que se criam, esta constante trata
 * de quem apaga a frase e quer a original de volta. Se um dia mudar, muda nos
 * dois.
 */
const FRASE_DE_OMISSAO =
  'Queremos ver o nosso dia pelos olhos daqueles que mais gostamos! Partilha o teu olhar 🤍'

const admin = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

/**
 * Compara duas chaves sem o tempo dizer quantos caracteres batem.
 *
 * Uma comparação normal desiste no primeiro carácter diferente, e o tempo que
 * demora a desistir conta quantos estavam certos. Com pedidos suficientes,
 * descobre-se a chave à letra.
 */
function igual(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'bad_request' }, 400)
  }

  const slug = String(body.slug ?? '').toLowerCase().trim()
  const chave = String(body.chave ?? '')
  if (!slug || !chave) return json({ error: 'sem_chave' }, 401)

  const sb = admin()
  const { data: evento } = await sb
    .from('events')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  /*
    A mesma resposta para "não existe" e para "a chave está errada". Distinguir
    as duas dizia a quem anda a tentar que este casamento é real, e a chave
    passava a valer a pena procurar.
  */
  if (!evento || !igual(chave, String(evento.download_token))) {
    return json({ error: 'sem_acesso' }, 401)
  }

  if (body.action === 'painel') {
    const { data: linhas, error } = await sb
      .from('event_media')
      .select('id, kind, storage_key, thumb_key, original_name, content_type, size_bytes, width, height, taken_at, uploaded_by_name, status, created_at')
      .eq('event_id', evento.id)
      .order('created_at', { ascending: false })
      .limit(2000)
    if (error) return json({ error: 'server_error' }, 500)

    const media = await Promise.all(
      (linhas ?? []).map(async (m) => ({
        id: m.id,
        kind: m.kind,
        nome: m.original_name,
        contentType: m.content_type,
        bytes: m.size_bytes,
        width: m.width,
        height: m.height,
        takenAt: m.taken_at,
        autor: m.uploaded_by_name,
        status: m.status,
        createdAt: m.created_at,
        /*
          A miniatura é o que a grelha usa; o grande só é assinado porque a
          fotografia em ecrã inteiro tem de abrir sem uma segunda ida ao
          servidor. São dois URLs por linha e não um, e é de propósito: mostrar
          a grelha com os ficheiros originais fazia o telemóvel do casal
          descarregar gigabytes para ver quadrados de 150 pixels.
        */
        thumbUrl: m.thumb_key ? await presign(m.thumb_key as string, 'GET', VER_TTL) : null,
        url: await presign(m.storage_key as string, 'GET', VER_TTL),
      })),
    )

    // Quem contribuiu, por nome. Quem não escreveu nome conta como uma pessoa
    // só, o que é falso, mas é menos falso do que contar cada anónimo como uma
    // pessoa diferente e dizer ao casal que teve 80 convidados a participar.
    const nomes = new Set(
      (linhas ?? []).map((m) => (m.uploaded_by_name ?? '').trim()).filter(Boolean),
    )
    const anonimos = (linhas ?? []).some((m) => !(m.uploaded_by_name ?? '').trim())

    return json({
      evento: {
        slug: evento.slug,
        coupleName: evento.couple_name,
        eventDate: evento.event_date,
        revealAt: evento.reveal_at,
        uploadWindowEndsAt: evento.upload_window_ends_at,
        guestsSeeGallery: evento.guests_see_gallery,
        moderation: evento.moderation,
        welcomeMessage: evento.welcome_message,
        bytesUsed: evento.bytes_used,
        maxTotalBytes: evento.max_total_bytes,
      },
      pessoas: nomes.size + (anonimos ? 1 : 0),
      media,
      expiresIn: VER_TTL,
    })
  }

  const ids = Array.isArray(body.ids) ? body.ids.map(String).slice(0, 2000) : []

  if (body.action === 'estado') {
    const status = String(body.status ?? '')
    if (!['pendente', 'aprovado', 'escondido'].includes(status)) {
      return json({ error: 'estado_invalido' }, 400)
    }
    if (!ids.length) return json({ ok: true })
    // O `event_id` no filtro não é decoração: sem ele, uma lista de ids de
    // outro casamento passava a ser editável com a chave deste.
    const { error } = await sb
      .from('event_media').update({ status }).eq('event_id', evento.id).in('id', ids)
    if (error) return json({ error: 'server_error' }, 500)
    return json({ ok: true })
  }

  if (body.action === 'apagar') {
    if (!ids.length) return json({ ok: true })
    const { data: linhas } = await sb
      .from('event_media')
      .select('id, storage_key, thumb_key')
      .eq('event_id', evento.id)
      .in('id', ids)

    /*
      Primeiro o ficheiro, depois a linha. Se o R2 falhar, fica uma linha a
      apontar para um ficheiro que ainda existe, e a próxima tentativa apaga os
      dois. Pela ordem contrária ficava um ficheiro pago para sempre sem
      ninguém saber que ele lá está.
    */
    const chaves = (linhas ?? []).flatMap((l) =>
      [l.storage_key as string, ...(l.thumb_key ? [l.thumb_key as string] : [])],
    )
    if (chaves.length) await deleteObjects(chaves)

    const { error } = await sb
      .from('event_media').delete().eq('event_id', evento.id)
      .in('id', (linhas ?? []).map((l) => l.id))
    if (error) return json({ error: 'server_error' }, 500)
    return json({ ok: true, apagados: (linhas ?? []).length })
  }

  if (body.action === 'definicoes') {
    const mudanca: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (typeof body.guestsSeeGallery === 'boolean') mudanca.guests_see_gallery = body.guestsSeeGallery
    if (typeof body.moderation === 'boolean') mudanca.moderation = body.moderation
    /*
      A frase. Vazia ou nula quer dizer "queremos a de sempre", e não "queremos
      uma página sem frase nenhuma": o convidado que abrisse o link ficava com
      um espaço branco por cima do botão e sem perceber porquê.
    */
    if (body.welcomeMessage === null || typeof body.welcomeMessage === 'string') {
      const escrita = String(body.welcomeMessage ?? '').trim().slice(0, 240)
      mudanca.welcome_message = escrita || FRASE_DE_OMISSAO
    }
    // A hora de revelação e a janela de envios são datas, e uma data inválida
    // vinda do browser fecharia o evento ou revelaria tudo por engano.
    if (body.revealAt === null || typeof body.revealAt === 'string') {
      const v = body.revealAt === null ? null : new Date(String(body.revealAt))
      if (v !== null && Number.isNaN(v.getTime())) return json({ error: 'data_invalida' }, 400)
      mudanca.reveal_at = v === null ? null : v.toISOString()
    }
    const { error } = await sb.from('events').update(mudanca).eq('id', evento.id)
    if (error) return json({ error: 'server_error' }, 500)
    return json({ ok: true })
  }

  return json({ error: 'unknown_action' }, 400)
})
