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

  /*
    Quem é "eu" nesta página.

    Antes vinha uma lista de ids do browser, e o servidor acreditava nela. A
    chave do browser é melhor por duas razões: é uma coisa só em vez de
    quinhentas, e o servidor passa a decidir o que é de quem em vez de o
    perguntar a quem está do outro lado.
  */
  const bruta = String(body.uploaderKey ?? '')
  // Só se aceita a chave se ela for o que devia ser. Vai para dentro de um
  // filtro `or`, e um valor com uma vírgula ou um parêntesis lá dentro deixava
  // de ser um valor e passava a ser sintaxe da consulta.
  const minhaChave = /^[0-9a-f]{16,80}$/i.test(bruta) ? bruta : ''

  let q = sb
    .from('event_media')
    .select('id, kind, storage_key, thumb_key, content_type, width, height, taken_at, uploaded_by_name, uploader_key, created_at')
    .eq('event_id', evento.id)
    // Escondido é escondido para toda a gente, incluindo para quem a carregou:
    // foi o casal que a tirou da vista, e isso é uma decisão deles.
    .neq('status', 'escondido')
    .order('created_at', { ascending: false })
    .limit(500)

  /*
    Com a galeria fechada aos convidados, cada um vê só o que carregou. Quem ele
    é sai da chave que o browser dele guarda, e não de uma conta: não há conta,
    e pedir uma era exactamente o que se quer evitar nesta página.
  */
  if (!evento.guests_see_gallery) {
    if (!minhaChave) return json({ coupleName: evento.couple_name, media: [] })
    q = q.eq('uploader_key', minhaChave)
  } else if (minhaChave) {
    /*
      A moderação decide o que os outros veem, nunca o que a própria pessoa vê
      do que acabou de enviar. Sem isto, uma convidada carregava três
      fotografias e ficava a olhar para uma galeria onde elas não estavam, e
      concluía, com razão, que o upload tinha falhado. O que se ganhava era uma
      pessoa a repetir o envio até desistir.
    */
    q = q.or(`status.eq.aprovado,uploader_key.eq.${minhaChave}`)
  } else {
    q = q.eq('status', 'aprovado')
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
      // Verdadeiro só nas que este browser carregou. É o que decide se aparece
      // o botão de apagar, e a decisão é do servidor e não do browser.
      minha: Boolean(minhaChave) && m.uploader_key === minhaChave,
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
