// Edge Function: operações de storage reservadas ao admin.
//
//   { action: 'upload-url', galleryId, fileName, contentType, kind }
//     → devolve { key, url } com um PUT pré-assinado. O ficheiro sobe do
//       browser direto para o R2, sem passar por aqui — é o que permite
//       carregar galerias inteiras sem estourar limites da função.
//
//   { action: 'delete', keys: [...] }
//     → apaga objetos do R2.
//
// Deploy:  supabase functions deploy admin-storage
// (SEM --no-verify-jwt: o gateway do Supabase valida o token antes de chegar
// aqui, e a verificação abaixo confirma que é mesmo um utilizador válido.)

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { cors, deleteObjects, json, presign, type BucketKind } from '../_shared/r2.ts'

const UPLOAD_TTL = 60 * 15 // 15 min para começar o upload

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  // Confirma que quem chama é um utilizador autenticado. O gateway já filtra
  // pedidos sem JWT, mas um anon key sozinho também passaria por lá — esta
  // verificação é a que distingue "tem uma chave pública" de "fez login".
  const authHeader = req.headers.get('Authorization') ?? ''
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  )
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) return json({ error: 'unauthorized' }, 401)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'bad_request' }, 400)
  }

  // 'public' escreve no bucket das imagens do site; por omissão, o privado.
  const bucket: BucketKind = body.bucket === 'public' ? 'public' : 'private'

  if (body.action === 'upload-url') {
    const galleryId = String(body.galleryId ?? '')
    const fileName = String(body.fileName ?? '')
    const contentType = String(body.contentType ?? 'application/octet-stream')
    const kind = body.kind === 'thumb' ? 'thumb' : 'full'
    if (!galleryId || !fileName) return json({ error: 'missing_fields' }, 400)

    // O nome do ficheiro entra no caminho: limpa-o para não permitir escapar da
    // pasta da galeria nem escrever noutro sítio do bucket.
    const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
    const stamp = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
    const key =
      kind === 'thumb'
        ? `${galleryId}/thumbs/${stamp}.webp`
        : `${galleryId}/${stamp}-${safe}`

    const url = await presign(key, 'PUT', UPLOAD_TTL, { 'content-type': contentType }, bucket)
    return json({ key, url })
  }

  if (body.action === 'delete') {
    const keys = Array.isArray(body.keys) ? body.keys.map(String) : []
    if (!keys.length) return json({ deleted: 0, failed: [] })
    const failed = await deleteObjects(keys, bucket)
    return json({ deleted: keys.length - failed.length, failed })
  }

  return json({ error: 'unknown_action' }, 400)
})
