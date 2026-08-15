// Comprovativo de acesso a uma galeria.
//
// O cliente é anónimo, por isso a função que regista atividade não pode
// simplesmente aceitar o que lhe mandam — senão qualquer pessoa inventava
// downloads. Quem acerta na password recebe este token assinado, e só com ele
// é possível registar eventos, na galeria a que pertence e durante o tempo em
// que os URLs assinados são válidos.
//
// Não é uma credencial de acesso a ficheiros: sozinho não abre nada.

const enc = new TextEncoder()

const keyPromise = crypto.subtle.importKey(
  'raw',
  enc.encode(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!),
  { name: 'HMAC', hash: 'SHA-256' },
  false,
  ['sign', 'verify'],
)

const b64url = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

const fromB64url = (s: string) =>
  Uint8Array.from(
    atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')),
    (c) => c.charCodeAt(0),
  )

export async function signAccessToken(galleryId: string, ttlSeconds: number): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify({
    g: galleryId,
    e: Math.floor(Date.now() / 1000) + ttlSeconds,
  })))
  const sig = await crypto.subtle.sign('HMAC', await keyPromise, enc.encode(payload))
  return `${payload}.${b64url(sig)}`
}

/** Devolve o id da galeria, ou null se o token for inválido ou tiver expirado. */
export async function verifyAccessToken(token: string): Promise<string | null> {
  const [payload, sig] = String(token ?? '').split('.')
  if (!payload || !sig) return null

  let valid: boolean
  try {
    valid = await crypto.subtle.verify('HMAC', await keyPromise, fromB64url(sig), enc.encode(payload))
  } catch {
    return null
  }
  if (!valid) return null

  try {
    const { g, e } = JSON.parse(new TextDecoder().decode(fromB64url(payload)))
    if (typeof g !== 'string' || typeof e !== 'number') return null
    if (e < Math.floor(Date.now() / 1000)) return null
    return g
  } catch {
    return null
  }
}
