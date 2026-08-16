// Edge Function: regista o que o cliente faz na galeria.
//
//   { token, kind: 'download_all' }
//   { token, kind: 'download_favorites' }
//   { token, kind: 'download_one', photoId, fileName }
//
// O token é o comprovativo emitido pela gallery-access a quem acertou na
// password. Sem ele — ou com um de outra galeria, ou expirado — não se escreve
// nada. É o que impede alguém de encher o registo com downloads inventados.
//
// Deploy:  supabase functions deploy gallery-log --no-verify-jwt

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { cors, json } from '../_shared/r2.ts'
import { verifyAccessToken } from '../_shared/token.ts'

const KINDS = new Set(['download_all', 'download_one', 'download_favorites'])

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

  const kind = String(body.kind ?? '')
  if (!KINDS.has(kind)) return json({ error: 'bad_request' }, 400)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  const { error } = await admin.from('gallery_events').insert({
    gallery_id: galleryId,
    kind,
    photo_id: kind === 'download_one' ? (body.photoId ?? null) : null,
    file_name: kind === 'download_one' ? String(body.fileName ?? '').slice(0, 200) || null : null,
  })
  if (error) {
    console.error('gallery_events', error)
    // Falhar a registar não é motivo para estragar o download do cliente.
    return json({ ok: false }, 200)
  }

  return json({ ok: true })
})
