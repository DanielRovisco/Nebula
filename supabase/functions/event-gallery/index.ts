// Edge Function: a galeria do evento, para convidados e para o casal.
//
//   { slug, ids? }
//     → as fotografias visíveis neste momento, já com URLs assinados.
//       `ids` limita às que este convidado carregou, que é o que o browser
//       dele guarda localmente.
//
// Deploy: supabase functions deploy event-gallery --no-verify-jwt
//
// Quem decide o que se vê é esta função, e não o browser. Três regras, por
// ordem: a hora de revelação, a moderação, e a definição de o convidado ver ou
// não o que os outros carregaram. Se qualquer uma delas vivesse do lado do
// cliente, bastava abrir as ferramentas do browser para ver o que ainda não
// devia ser visto.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { cors, json, presign } from '../_shared/r2.ts'

const VER_TTL = 60 * 60 * 2

const admin = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

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
  const sb = admin()
  const { data: evento } = await sb
    .from('events')
    .select('id, couple_name, event_date, reveal_at, guests_see_gallery, upload_window_ends_at')
    .eq('slug', slug)
    .maybeSingle()
  if (!evento) return json({ error: 'nao_encontrado' }, 404)

  /*
    Antes da hora de revelação não se devolve fotografia nenhuma, nem sequer
    quantas há. Contar é meio caminho para adivinhar, e quem escolheu adiar a
    revelação escolheu não saber nada até lá.
  */
  const escondido =
    evento.reveal_at && new Date(evento.reveal_at as string).getTime() > Date.now()
  if (escondido) {
    return json({
      coupleName: evento.couple_name,
      revealAt: evento.reveal_at,
      escondido: true,
      media: [],
    })
  }

  const meus = Array.isArray(body.ids) ? body.ids.map(String).slice(0, 500) : null

  let q = sb
    .from('event_media')
    .select('id, kind, storage_key, thumb_key, content_type, width, height, taken_at, uploaded_by_name, created_at')
    .eq('event_id', evento.id)
    .eq('status', 'aprovado')
    .order('created_at', { ascending: false })
    .limit(500)

  /*
    Com a galeria fechada aos convidados, cada um vê só o que carregou. A lista
    de ids vem do browser dele, o que é de propósito: não há conta, portanto não
    há forma de saber quem é sem lhe pedir uma, e pedi-la era exactamente o que
    se quer evitar. O pior que alguém faz com uma lista de ids inventada é ver
    fotografias do casamento onde já estava.
  */
  if (!evento.guests_see_gallery) {
    if (!meus || meus.length === 0) return json({ coupleName: evento.couple_name, media: [] })
    q = q.in('id', meus)
  }

  const { data: linhas, error } = await q
  if (error) return json({ error: 'server_error' }, 500)

  const media = await Promise.all(
    (linhas ?? []).map(async (m) => ({
      id: m.id,
      kind: m.kind,
      contentType: m.content_type,
      width: m.width,
      height: m.height,
      takenAt: m.taken_at,
      name: m.uploaded_by_name,
      createdAt: m.created_at,
      url: await presign(m.storage_key as string, 'GET', VER_TTL),
      thumbUrl: m.thumb_key ? await presign(m.thumb_key as string, 'GET', VER_TTL) : null,
    })),
  )

  return json({
    coupleName: evento.couple_name,
    eventDate: evento.event_date,
    aberto: new Date(evento.upload_window_ends_at as string).getTime() > Date.now(),
    media,
    expiresIn: VER_TTL,
  })
})
