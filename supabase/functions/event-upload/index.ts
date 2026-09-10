// Edge Function: upload de convidados, sem conta nenhuma.
//
//   { action: 'info', slug }
//     → o que o convidado precisa de saber para desenhar a página: nome do
//       casal, se a janela está aberta, tamanho máximo por ficheiro.
//
//   { action: 'upload-url', slug, fileName, contentType, sizeBytes }
//     → PUT pré-assinado para o bucket privado, se tudo bater certo.
//
//   { action: 'registar', slug, key, thumbKey, ... }
//     → escreve a linha depois de o ficheiro ter subido.
//
// Deploy: supabase functions deploy event-upload --no-verify-jwt
// (sem verificação de JWT de propósito: quem carrega é um convidado sem conta,
// e quem autoriza é o slug do evento e a janela de tempo)
//
// ─────────────────────────────────────────────────────────────────────────────
// Esta é a única porta do sistema que se abre sem credenciais, e é por ela que
// se paga o armazenamento. Todas as verificações abaixo existem por isso, e
// nenhuma delas está do lado do browser: o browser diz o que quiser, e o que
// vale é o que se confirma aqui.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { cors, json, presign } from '../_shared/r2.ts'

const UPLOAD_TTL = 60 * 30 // 30 min: em rede de quinta, um vídeo demora

const admin = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

/** Limpa o nome do ficheiro para ele não escapar da pasta do evento. */
const seguro = (nome: string) => nome.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)

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
  if (!slug) return json({ error: 'sem_evento' }, 400)

  const sb = admin()
  const { data: evento } = await sb
    .from('events')
    .select('id, couple_name, event_date, upload_window_ends_at, moderation, max_file_bytes, max_total_bytes, bytes_used, welcome_message')
    .eq('slug', slug)
    .maybeSingle()

  // A mesma resposta para "não existe" e para "existe mas não é para ti": não
  // se diz a ninguém que eventos há, nem se deixa adivinhar slugs por tentativa.
  if (!evento) return json({ error: 'nao_encontrado' }, 404)

  const aberto = new Date(evento.upload_window_ends_at as string).getTime() > Date.now()

  if (body.action === 'info') {
    return json({
      coupleName: evento.couple_name,
      eventDate: evento.event_date,
      aberto,
      fecha: evento.upload_window_ends_at,
      maxFileBytes: evento.max_file_bytes,
      // A frase escrita pelos noivos, ou a de omissão da própria coluna.
      welcome: evento.welcome_message,
    })
  }

  if (!aberto) return json({ error: 'janela_fechada' }, 403)

  if (body.action === 'upload-url') {
    const sizeBytes = Number(body.sizeBytes ?? 0)
    const contentType = String(body.contentType ?? 'application/octet-stream')
    const fileName = seguro(String(body.fileName ?? 'ficheiro'))

    if (!sizeBytes || sizeBytes <= 0) return json({ error: 'tamanho_invalido' }, 400)
    if (sizeBytes > Number(evento.max_file_bytes)) {
      return json({ error: 'ficheiro_grande', maxFileBytes: evento.max_file_bytes }, 413)
    }
    /*
      O tecto do evento é verificado com o tamanho deste ficheiro somado. Não é
      uma barreira perfeita: dois uploads em paralelo podem passar juntos os
      últimos megabytes. É de propósito — trancar isto com precisão obrigava a
      serializar os uploads, e travar a festa toda para poupar uns megabytes no
      limite seria trocar o problema certo pelo errado.
    */
    if (Number(evento.bytes_used) + sizeBytes > Number(evento.max_total_bytes)) {
      return json({ error: 'evento_cheio' }, 507)
    }
    if (!/^(image|video)\//.test(contentType)) {
      return json({ error: 'tipo_nao_aceite' }, 415)
    }

    const carimbo = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
    const key = `eventos/${evento.id}/${carimbo}-${fileName}`
    const url = await presign(key, 'PUT', UPLOAD_TTL, { 'content-type': contentType })
    return json({ key, url })
  }

  if (body.action === 'registar') {
    const key = String(body.key ?? '')
    // O caminho tem de ser o que esta função emitiu para este evento. Sem isto,
    // bastava inventar uma chave para registar como sendo do casamento um
    // ficheiro que está noutro sítio do bucket.
    if (!key.startsWith(`eventos/${evento.id}/`)) return json({ error: 'chave_invalida' }, 400)

    const contentType = String(body.contentType ?? '')
    const clientId = body.clientId ? String(body.clientId).slice(0, 80) : null

    const { data: linha, error } = await sb.from('event_media').insert({
      event_id: evento.id,
      kind: contentType.startsWith('video/') ? 'video' : 'foto',
      storage_key: key,
      original_name: body.fileName ? String(body.fileName).slice(0, 200) : null,
      thumb_key: body.thumbKey ? String(body.thumbKey) : null,
      content_type: contentType || null,
      size_bytes: Number(body.sizeBytes ?? 0),
      width: body.width ? Number(body.width) : null,
      height: body.height ? Number(body.height) : null,
      taken_at: body.takenAt ? String(body.takenAt) : null,
      uploaded_by_name: body.name ? String(body.name).slice(0, 60) : null,
      // É por esta chave que o convidado consegue apagar o que enviou, e só o
      // que enviou. Vem do browser dele e não identifica ninguém.
      uploader_key: body.uploaderKey ? String(body.uploaderKey).slice(0, 80) : null,
      client_id: clientId,
      // Com moderação ligada, entra à espera de aprovação.
      status: evento.moderation ? 'pendente' : 'aprovado',
    }).select('id').single()

    /*
      23505 é a chave única do envio: esta fotografia já foi registada. Acontece
      quando o registo correu bem e só a resposta se perdeu pelo caminho, e o
      browser voltou a tentar. Não é um erro — é a prova de que a primeira
      tentativa funcionou. Devolve-se o id que já existe e segue.
    */
    if (error && error.code === '23505' && clientId) {
      const { data: jaLa } = await sb
        .from('event_media')
        .select('id')
        .eq('event_id', evento.id)
        .eq('client_id', clientId)
        .maybeSingle()
      if (jaLa) return json({ ok: true, id: jaLa.id, repetido: true })
    }
    if (error) return json({ error: 'server_error' }, 500)

    // O id volta para o browser do convidado, que o guarda. É o que lhe permite
    // apagar o que enviou.
    return json({ ok: true, id: linha?.id })
  }

  /*
    Apagar uma fotografia que o próprio convidado enviou.
    
    Fica dentro da janela de envios de propósito: enquanto se pode carregar,
    pode-se corrigir. Depois de a janela fechar, a colecção é dos noivos, e
    quem quiser tirar de lá alguma coisa fala com eles — que é o que a página
    promete na secção de privacidade.
  */
  if (body.action === 'remover') {
    const id = String(body.id ?? '')
    const uploaderKey = String(body.uploaderKey ?? '')
    if (!id || !uploaderKey) return json({ error: 'bad_request' }, 400)

    /*
      As três condições contam. O id sozinho não autoriza nada: quem o tivesse
      apagava fotografias de outra pessoa. É o par id + chave, dentro deste
      evento, que faz a prova.
    */
    const { data: linha } = await sb
      .from('event_media')
      .select('id')
      .eq('id', id)
      .eq('event_id', evento.id)
      .eq('uploader_key', uploaderKey)
      .is('deleted_at', null)
      .maybeSingle()

    // A mesma resposta para "não existe" e para "não é tua": nem se confirma
    // que a fotografia existe a quem não tem a chave dela.
    if (!linha) return json({ error: 'nao_encontrado' }, 404)

    /*
      Marca-se, não se apaga. O ficheiro fica no R2 e a linha fica na base de
      dados, fora da vista de toda a gente, incluindo do próprio.

      É de propósito, e é a diferença entre um engano e uma perda: um convidado
      que apague a fotografia errada num telemóvel, a meio de uma festa, não
      pode ser a última palavra sobre uma fotografia de casamento. Os noivos
      veem-na no lixo e podem trazê-la de volta.
    */
    const { error } = await sb
      .from('event_media')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', linha.id)
    if (error) return json({ error: 'server_error' }, 500)
    return json({ ok: true })
  }

  return json({ error: 'unknown_action' }, 400)
})
