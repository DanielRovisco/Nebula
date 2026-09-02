// Acesso ao Cloudflare R2 a partir das Edge Functions.
//
// As credenciais do R2 vivem só aqui, nos secrets do Supabase — nunca chegam ao
// browser. O que o browser recebe são URLs pré-assinados de curta duração: um
// PUT para carregar (só o admin autenticado os obtém) e GETs para ver e
// descarregar (só depois de acertar na password da galeria).
//
// Secrets necessários:
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
//   R2_JURISDICTION (opcional: 'eu' ou 'fedramp')
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20'

const accountId = Deno.env.get('R2_ACCOUNT_ID')!

// Dois buckets com propósitos opostos: as galerias de cliente são privadas e
// só se abrem com URLs assinados; as imagens do site são públicas, porque uma
// página pública não pode depender de links que expiram.
const BUCKETS = {
  private: Deno.env.get('R2_BUCKET') ?? 'galleries',
  public: Deno.env.get('R2_PUBLIC_BUCKET') ?? 'nebula-site',
} as const

export type BucketKind = keyof typeof BUCKETS

/*
  Buckets criados com jurisdição — o nosso é da União Europeia, porque guarda
  fotografias de pessoas identificáveis — respondem noutro endereço:
  `<conta>.eu.r2...` em vez de `<conta>.r2...`. Assinar contra o endereço
  errado não dá um erro de permissões que se perceba: dá "bucket não
  encontrado", como se o bucket não existisse de todo.
*/
const jurisdicao = Deno.env.get('R2_JURISDICTION')?.trim().toLowerCase()
export const R2_ENDPOINT = `https://${accountId}${jurisdicao ? `.${jurisdicao}` : ''}.r2.cloudflarestorage.com`

const client = new AwsClient({
  accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID')!,
  secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY')!,
  service: 's3',
  region: 'auto',
})

export const objectUrl = (key: string, kind: BucketKind = 'private') =>
  `${R2_ENDPOINT}/${BUCKETS[kind]}/${key.split('/').map(encodeURIComponent).join('/')}`

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
  kind: BucketKind = 'private',
  /**
   * Parâmetros extra a assinar junto com o resto. Usado para o
   * `response-content-disposition`, que faz o R2 devolver o ficheiro como
   * anexo. Têm de ir antes da assinatura: acrescentados depois, a assinatura
   * deixa de bater certo e o R2 responde 403.
   */
  query: Record<string, string> = {},
): Promise<string> {
  const url = new URL(objectUrl(key, kind))
  url.searchParams.set('X-Amz-Expires', String(expiresIn))
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)
  const signed = await client.sign(url.toString(), {
    method,
    headers,
    aws: { signQuery: true },
  })
  return signed.url
}

/**
 * URL que descarrega o ficheiro em vez de o mostrar, com o nome original.
 *
 * Existe por uma razão concreta: descarregar com `fetch` obriga o bucket a
 * responder com cabeçalhos de CORS, e quando essa configuração falha o
 * download morre com "blocked by CORS policy" — mesmo estando tudo o resto
 * bem. Um link normal para um URL assinado com `response-content-disposition`
 * não é um pedido de CORS de todo: o browser descarrega e não pergunta nada.
 *
 * O nome vai em `filename*` no formato RFC 5987 para sobreviver a acentos, e
 * também em `filename` simples para browsers antigos.
 */
export function presignDownload(
  key: string,
  fileName: string,
  expiresIn: number,
  kind: BucketKind = 'private',
): Promise<string> {
  // Aspas e barras invertidas partiriam o cabeçalho ao meio.
  const seguro = fileName.replace(/["\\]/g, '_')
  const ascii = seguro.replace(/[^\x20-\x7e]/g, '_')
  const disposition =
    `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(seguro)}`
  return presign(key, 'GET', expiresIn, {}, kind, {
    'response-content-disposition': disposition,
  })
}

/** Apaga objetos. Erros por objeto não travam os restantes. */
export async function deleteObjects(keys: string[], kind: BucketKind = 'private'): Promise<string[]> {
  const failed: string[] = []
  await Promise.all(
    keys.map(async (key) => {
      try {
        const res = await client.fetch(objectUrl(key, kind), { method: 'DELETE' })
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
