// Acesso ao Cloudflare R2 a partir das Edge Functions.
//
// As credenciais do R2 vivem só aqui, nos secrets do Supabase — nunca chegam ao
// browser. O que o browser recebe são URLs pré-assinados de curta duração: um
// PUT para carregar (só o admin autenticado os obtém) e GETs para ver e
// descarregar (só depois de acertar na password da galeria).
//
// Secrets necessários:
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20'

const accountId = Deno.env.get('R2_ACCOUNT_ID')!
const bucket = Deno.env.get('R2_BUCKET') ?? 'galleries'

export const R2_ENDPOINT = `https://${accountId}.r2.cloudflarestorage.com`

const client = new AwsClient({
  accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID')!,
  secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY')!,
  service: 's3',
  region: 'auto',
})

export const objectUrl = (key: string) =>
  `${R2_ENDPOINT}/${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`

/**
 * URL assinado para uma operação, válido por `expiresIn` segundos.
 *
 * O R2 aceita a assinatura na query string (`X-Amz-Expires`), que é o que
 * permite entregar o URL ao browser sem lhe dar credenciais.
 */
export async function presign(
  key: string,
  method: 'GET' | 'PUT' | 'DELETE',
  expiresIn: number,
  headers: Record<string, string> = {},
): Promise<string> {
  const url = new URL(objectUrl(key))
  url.searchParams.set('X-Amz-Expires', String(expiresIn))
  const signed = await client.sign(url.toString(), {
    method,
    headers,
    aws: { signQuery: true },
  })
  return signed.url
}

/** Apaga objetos. Erros por objeto não travam os restantes. */
export async function deleteObjects(keys: string[]): Promise<string[]> {
  const failed: string[] = []
  await Promise.all(
    keys.map(async (key) => {
      try {
        const res = await client.fetch(objectUrl(key), { method: 'DELETE' })
        // 404 conta como sucesso: o objetivo era não existir.
        if (!res.ok && res.status !== 404) failed.push(key)
      } catch {
        failed.push(key)
      }
    }),
  )
  return failed
}

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'content-type': 'application/json' },
  })
