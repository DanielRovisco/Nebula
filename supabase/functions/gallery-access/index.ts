// Edge Function: único caminho pelo qual um cliente chega às fotos.
//
// Recebe slug + password, valida no Postgres (crypt), e só então devolve URLs
// pré-assinados do R2, de curta duração. O bucket é privado, portanto sem
// passar por aqui não há acesso a ficheiro nenhum — é isto que torna a proteção
// real e não decorativa.
//
// Deploy:  supabase functions deploy gallery-access --no-verify-jwt
// (--no-verify-jwt porque o cliente é anónimo; a autorização é a password.)

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { cors, json, presign, presignDownload } from '../_shared/r2.ts'
import { signAccessToken } from '../_shared/token.ts'

const SIGNED_URL_TTL = 60 * 60 * 2 // 2 horas

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  let slug: string, password: string
  try {
    const body = await req.json()
    slug = String(body.slug ?? '').trim().toLowerCase()
    password = String(body.password ?? '')
  } catch {
    return json({ error: 'bad_request' }, 400)
  }
  if (!slug || !password) return json({ error: 'missing_fields' }, 400)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  const { data: rows, error } = await admin.rpc('verify_gallery_password', {
    p_slug: slug,
    p_password: password,
  })
  if (error) {
    console.error('verify_gallery_password', error)
    return json({ error: 'server_error' }, 500)
  }

  const gallery = rows?.[0]
  if (!gallery) {
    // Resposta deliberadamente igual para password errada, galeria inexistente,
    // por publicar, expirada ou bloqueada por tentativas — não damos pistas a
    // quem anda a adivinhar.
    return json({ error: 'invalid_credentials' }, 401)
  }

  const { data: photos, error: photosError } = await admin
    .from('photos')
    .select('id, storage_path, thumb_path, file_name, content_type, width, height, size_bytes, sort_order')
    .eq('gallery_id', gallery.id)
    .order('sort_order', { ascending: true })
  if (photosError) {
    console.error('photos', photosError)
    return json({ error: 'server_error' }, 500)
  }

  // Assina tudo de uma vez. Uma galeria publicada mas ainda sem fotos é um
  // estado normal (o cliente recebeu o link antes da entrega) e o cliente já
  // sabe mostrar uma galeria vazia.
  const signed = await Promise.all(
    photos.map(async (p) => ({
      id: p.id,
      fileName: p.file_name,
      contentType: p.content_type,
      width: p.width,
      height: p.height,
      sizeBytes: p.size_bytes,
      url: await presign(p.storage_path, 'GET', SIGNED_URL_TTL),
      thumbUrl: p.thumb_path ? await presign(p.thumb_path, 'GET', SIGNED_URL_TTL) : null,
      // Segundo URL, do mesmo ficheiro, que o R2 devolve como anexo. Serve o
      // download de uma foto sozinha sem passar por `fetch`, ou seja sem
      // depender do CORS do bucket.
      downloadUrl: await presignDownload(p.storage_path, p.file_name, SIGNED_URL_TTL),
    })),
  )

  // Fotografias que o cliente já marcou. Sem isto os corações apareciam todos
  // vazios a cada visita e a escolha parecia perdida.
  const { data: favoritas } = await admin
    .from('gallery_favorites')
    .select('photo_id')
    .eq('gallery_id', gallery.id)

  // A abertura da galeria fica registada. Se falhar, não é motivo para negar
  // o acesso a quem acertou na password.
  admin
    .from('gallery_events')
    .insert({ gallery_id: gallery.id, kind: 'open' })
    .then(({ error }) => error && console.error('log open', error))

  // A capa é uma das fotos da galeria: reaproveita-se o URL já assinado em vez
  // de assinar duas vezes o mesmo objeto.
  const cover = gallery.cover_photo_id
    ? signed.find((p) => p.id === gallery.cover_photo_id)
    : undefined

  return json({
    gallery: {
      id: gallery.id,
      slug: gallery.slug,
      title: gallery.title,
      clientName: gallery.client_name,
      message: gallery.message,
      downloadEnabled: gallery.download_enabled,
      coverTitle: gallery.cover_title,
      coverFont: gallery.cover_font ?? 'serif',
      logoVariant: gallery.logo_variant ?? 'white',
      // Sem capa escolhida, a primeira foto serve — uma galeria nunca abre num
      // ecrã vazio.
      coverUrl: cover?.url ?? signed[0]?.url ?? null,
      // Uma capa em vídeo é reproduzida em ciclo; uma imagem é uma imagem.
      coverIsVideo: Boolean((cover ?? signed[0])?.contentType?.startsWith('video/')),
      // Quando a galeria fecha. Null = sem prazo.
      expiresAt: gallery.expires_at ?? null,
    },
    favorites: (favoritas ?? []).map((f) => f.photo_id as string),
    expiresIn: SIGNED_URL_TTL,
    // Comprovativo para o cliente poder registar downloads. Sozinho não abre
    // ficheiro nenhum.
    logToken: await signAccessToken(gallery.id, SIGNED_URL_TTL),
    photos: signed,
  })
})
