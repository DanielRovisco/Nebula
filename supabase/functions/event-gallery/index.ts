// Edge Function: a galeria do evento, para convidados e para o casal.
//
//   { slug, uploaderKey? }
//     → as fotografias visíveis neste momento, já com URLs assinados.
//
//   { action: 'descarregar', slug, id, uploaderKey? }
//     → um URL que o R2 devolve como anexo, para o convidado levar aquele
//       ficheiro. Só se o casal tiver deixado.
//
// Deploy: supabase functions deploy event-gallery --no-verify-jwt
//
// Quem decide o que se vê é esta função, e não o browser. Três regras, por
// ordem: a hora de revelação, a moderação, e a definição de o convidado ver ou
// não o que os outros carregaram. Se qualquer uma delas vivesse do lado do
// cliente, bastava abrir as ferramentas do browser para ver o que ainda não
// devia ser visto.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { cors, json, presign, presignDownload } from '../_shared/r2.ts'

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
    .select('id, couple_name, event_date, reveal_at, guests_see_gallery, guests_can_download, upload_window_ends_at')
    .eq('slug', slug)
    .maybeSingle()
  if (!evento) return json({ error: 'nao_encontrado' }, 404)

  const bruta = String(body.uploaderKey ?? '')
  // Só se aceita a chave se ela for o que devia ser. Vai para dentro de um
  // filtro `or`, e um valor com uma vírgula ou um parêntesis lá dentro deixava
  // de ser um valor e passava a ser sintaxe da consulta.
  const minhaChave = /^[0-9a-f]{16,80}$/i.test(bruta) ? bruta : ''

  /*
    Levar um ficheiro.

    A pergunta "posso?" é feita aqui e não no browser. O botão do lado de lá
    pode desaparecer com uma linha de CSS; o que impede mesmo alguém de levar
    as fotografias de um casamento cujos noivos disseram que não é isto.

    As mesmas regras de quem vê: nada antes da hora de revelação, nada do que
    está no lixo ou escondido, e do que está à espera de aprovação só a própria
    pessoa leva o que enviou.
  */
  if (body.action === 'descarregar') {
    if (!evento.guests_can_download) return json({ error: 'nao_permitido' }, 403)
    if (evento.reveal_at && new Date(evento.reveal_at as string).getTime() > Date.now()) {
      return json({ error: 'ainda_nao' }, 403)
    }

    const id = String(body.id ?? '')
    if (!id) return json({ error: 'bad_request' }, 400)

    const { data: m } = await sb
      .from('event_media')
      .select('storage_key, original_name, kind, status, uploader_key')
      .eq('id', id).eq('event_id', evento.id)
      .neq('status', 'escondido')
      .is('deleted_at', null)
      .maybeSingle()
    if (!m) return json({ error: 'nao_encontrado' }, 404)

    const minha = Boolean(minhaChave) && m.uploader_key === minhaChave
    // Com a galeria fechada aos convidados, cada um só leva o que enviou.
    if (!evento.guests_see_gallery && !minha) return json({ error: 'nao_encontrado' }, 404)
    // O que está à espera de aprovação ainda não é de ninguém a não ser de quem
    // o enviou.
    if (m.status !== 'aprovado' && !minha) return json({ error: 'nao_encontrado' }, 404)

    /*
      Um URL que o R2 devolve como anexo, aberto com um link normal. Não é um
      pedido de CORS, e é por isso que este caminho não morre quando a política
      do bucket não está perfeita — a lição que o download das galerias de
      cliente já tinha aprendido à sua custa.
    */
    const nome = String(m.original_name ?? `${m.kind}-${id.slice(0, 8)}`)
    const url = await presignDownload(String(m.storage_key), nome, 60 * 10)
    return json({ url })
  }

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

  let q = sb
    .from('event_media')
    .select('id, kind, storage_key, thumb_key, content_type, width, height, taken_at, uploaded_by_name, uploader_key, created_at')
    .eq('event_id', evento.id)
    // Escondido é escondido para toda a gente, incluindo para quem a carregou:
    // foi o casal que a tirou da vista, e isso é uma decisão deles.
    .neq('status', 'escondido')
    // O que está no lixo não se mostra a ninguém. Continua guardado.
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(500)

  /*
    Com a galeria fechada aos convidados, cada um vê só o que carregou. Quem ele
    é sai da chave que o browser dele guarda, e não de uma conta: não há conta,
    e pedir uma era exactamente o que se quer evitar nesta página.
  */
  if (!evento.guests_see_gallery) {
    if (!minhaChave) {
      return json({
        coupleName: evento.couple_name,
        podeDescarregar: evento.guests_can_download,
        media: [],
      })
    }
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
    // O botão de levar só aparece se o casal tiver deixado. Quem mande o pedido
    // à mesma leva um 403 daqui.
    podeDescarregar: evento.guests_can_download,
    media,
    expiresIn: VER_TTL,
  })
})
