// Edge Function: o cliente marca (ou desmarca) uma fotografia como favorita.
//
//   { token, photoId, on: true | false }
//
// Serve para a escolha do álbum: o cliente marca o que quer e nós vemos a lista
// no painel, em vez de a recebermos por email como nomes de ficheiro.
//
// Tal como no registo de atividade, quem autoriza é o comprovativo emitido pela
// gallery-access a quem acertou na password — e a fotografia tem de ser mesmo
// da galeria desse comprovativo, senão qualquer cliente podia marcar fotos de
// galerias alheias.
//
// Deploy:  supabase functions deploy gallery-favorite --no-verify-jwt

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { cors, json } from '../_shared/r2.ts'
import { verifyAccessToken } from '../_shared/token.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'bad_request' }, 400)
  }

  const galleryId = await verifyAccessToken(String(body.token ?? ''))
  if (!galleryId) return json({ error: 'unauthorized' }, 401)

  const photoId = String(body.photoId ?? '')
  if (!photoId) return json({ error: 'bad_request' }, 400)
  const on = body.on !== false

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  // A fotografia tem de pertencer à galeria do comprovativo.
  const { data: foto } = await admin
    .from('photos')
    .select('id')
    .eq('id', photoId)
    .eq('gallery_id', galleryId)
    .maybeSingle()
  if (!foto) return json({ error: 'not_found' }, 404)

  const { error } = on
    ? await admin
        .from('gallery_favorites')
        .upsert({ gallery_id: galleryId, photo_id: photoId }, { onConflict: 'gallery_id,photo_id' })
    : await admin
        .from('gallery_favorites')
        .delete()
        .eq('gallery_id', galleryId)
        .eq('photo_id', photoId)

  if (error) {
    console.error('gallery_favorites', error)
    return json({ error: 'server_error' }, 500)
  }

  return json({ ok: true, on })
})
