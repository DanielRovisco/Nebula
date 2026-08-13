// Edge Function: único caminho pelo qual um cliente chega às fotos.
//
// Corre com a service role, mas nunca a expõe: recebe slug + password, valida
// no Postgres (crypt), e só então devolve signed URLs de curta duração. O
// bucket é privado, portanto sem passar por aqui não há acesso a ficheiro
// nenhum — é isto que torna a proteção real e não decorativa.
//
// Deploy:  supabase functions deploy gallery-access --no-verify-jwt
// (--no-verify-jwt porque o cliente é anónimo; a autorização é a password.)

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SIGNED_URL_TTL = 60 * 60 * 2 // 2 horas

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'content-type': 'application/json' },
  })

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
    .select('id, storage_path, thumb_path, file_name, width, height, size_bytes, sort_order')
    .eq('gallery_id', gallery.id)
    .order('sort_order', { ascending: true })
  if (photosError) {
    console.error('photos', photosError)
    return json({ error: 'server_error' }, 500)
  }

  // Assina tudo de uma vez: as fotos em tamanho real e as miniaturas.
  const paths = [
    ...photos.map((p) => p.storage_path),
    ...photos.map((p) => p.thumb_path).filter(Boolean) as string[],
  ]
  const { data: signed, error: signError } = await admin.storage
    .from('galleries')
    .createSignedUrls(paths, SIGNED_URL_TTL)
  if (signError) {
    console.error('sign', signError)
    return json({ error: 'server_error' }, 500)
  }

  const urlByPath = new Map(signed.map((s) => [s.path, s.signedUrl]))

  return json({
    gallery: {
      id: gallery.id,
      slug: gallery.slug,
      title: gallery.title,
      clientName: gallery.client_name,
      message: gallery.message,
      downloadEnabled: gallery.download_enabled,
    },
    expiresIn: SIGNED_URL_TTL,
    photos: photos.map((p) => ({
      id: p.id,
      fileName: p.file_name,
      width: p.width,
      height: p.height,
      sizeBytes: p.size_bytes,
      url: urlByPath.get(p.storage_path) ?? null,
      thumbUrl: p.thumb_path ? urlByPath.get(p.thumb_path) ?? null : null,
    })),
  })
})
