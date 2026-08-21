// Diagnóstico da configuração das galerias privadas.
//
//   npm run setup:check
//
// Verifica, por ordem, cada peça da cadeia Supabase → Edge Functions → R2 e diz
// exatamente qual falhou e o que fazer. Serve para não andar a adivinhar qual
// dos três serviços está mal quando o upload não funciona.
//
// Lê .env.local. Para testar também o upload (o teste mais completo), define
// ADMIN_EMAIL e ADMIN_PASSWORD — as credenciais que criaste em
// Authentication → Users.
import { readFileSync, existsSync } from 'node:fs'

const env = {}
for (const file of ['.env.local', '.env']) {
  if (!existsSync(file)) continue
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
const get = (k) => process.env[k] || env[k] || ''

const URL_ = get('VITE_SUPABASE_URL').replace(/\/$/, '')
const ANON = get('VITE_SUPABASE_ANON_KEY')
const ADMIN_EMAIL = get('ADMIN_EMAIL')
const ADMIN_PASSWORD = get('ADMIN_PASSWORD')

let failures = 0
const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`)
const bad = (m, fix) => {
  failures++
  console.log(`  \x1b[31m✗\x1b[0m ${m}`)
  if (fix) console.log(`    \x1b[2m→ ${fix}\x1b[0m`)
}
const skip = (m) => console.log(`  \x1b[2m· ${m}\x1b[0m`)
const step = (n, t) => console.log(`\n\x1b[1m${n}. ${t}\x1b[0m`)

// ─── 1. Variáveis ────────────────────────────────────────────────────────
step(1, 'Variáveis do site')
if (!URL_) bad('VITE_SUPABASE_URL em falta', 'Supabase → Project Settings → API → Project URL, para .env.local')
// O URL tem de ser a raiz do projeto. Com `/rest/v1` colado no fim — que é o
// que a página do Supabase mostra — falha tudo o resto e nada aponta para aqui.
else if (/\/(rest|auth|storage|functions|realtime)\/v\d+$/.test(URL_))
  bad(
    `VITE_SUPABASE_URL tem um caminho a mais: ${URL_}`,
    `Deixa só a raiz: ${URL_.replace(/\/(rest|auth|storage|functions|realtime)\/v\d+$/, '')}`,
  )
else if (!/^https:\/\/[^/]+$/.test(URL_))
  bad(`VITE_SUPABASE_URL não parece a raiz do projeto: ${URL_}`, 'Deve ser https://<ref>.supabase.co e nada mais')
else ok(`VITE_SUPABASE_URL = ${URL_}`)
if (!ANON) bad('VITE_SUPABASE_ANON_KEY em falta', 'Supabase → Project Settings → API → anon public')
else ok(`VITE_SUPABASE_ANON_KEY = ${ANON.slice(0, 12)}…`)

if (!URL_ || !ANON) {
  console.log('\n\x1b[31mSem estas duas não dá para continuar.\x1b[0m')
  process.exit(1)
}

const rest = (path, init = {}) =>
  fetch(`${URL_}${path}`, {
    ...init,
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, ...(init.headers ?? {}) },
  })

// ─── 2. Projeto de pé ────────────────────────────────────────────────────
step(2, 'Projeto Supabase')
try {
  const res = await rest('/rest/v1/')
  // Um 404 na raiz deixou de contar como bom sinal: era o que deixava passar
  // um URL com caminho a mais, e o problema só aparecia três passos à frente.
  if (res.ok || res.status === 401) ok(`responde (HTTP ${res.status})`)
  else if (res.status === 404) bad('respondeu 404 na raiz', 'O URL do projeto está errado — confirma que não tem caminho')
  else bad(`respondeu HTTP ${res.status}`, 'O projeto pode estar pausado — abre-o no dashboard para acordar')
} catch (e) {
  bad(`não respondeu: ${e.message}`, 'Confirma o URL, ou o projeto pode estar pausado')
}

// ─── 3. Esquema ──────────────────────────────────────────────────────────
step(3, 'Esquema da base de dados')
try {
  const res = await rest('/rest/v1/galleries_admin?select=id&limit=1')
  if (res.status === 200) ok('tabelas e vista criadas')
  else if (res.status === 401 || res.status === 403) ok('existe e está protegida por RLS (esperado sem login)')
  else if (res.status === 404) bad('galleries_admin não existe', 'SQL Editor → colar supabase/schema.sql → Run')
  else bad(`resposta inesperada: HTTP ${res.status}`)
} catch (e) {
  bad(`falhou: ${e.message}`)
}

// ─── 4. Edge Function do cliente ─────────────────────────────────────────
step(4, 'Edge Function gallery-access')
try {
  const res = await fetch(`${URL_}/functions/v1/gallery-access`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: ANON, Authorization: `Bearer ${ANON}` },
    body: JSON.stringify({ slug: '__inexistente__', password: 'x' }),
  })
  const body = await res.json().catch(() => ({}))
  if (res.status === 401 && body.error === 'invalid_credentials') {
    ok('deployed e a falar com a base de dados')
  } else if (res.status === 404) {
    bad('não está deployed', 'supabase functions deploy gallery-access --no-verify-jwt')
  } else if (res.status === 500) {
    bad('deployed mas rebentou', 'Vê os logs: normalmente falta correr o schema.sql ou os secrets do R2')
  } else if (res.status === 401 && !body.error) {
    bad('o gateway está a exigir JWT', 'Refaz o deploy COM --no-verify-jwt')
  } else {
    bad(`resposta inesperada: HTTP ${res.status} ${JSON.stringify(body)}`)
  }
} catch (e) {
  bad(`falhou: ${e.message}`)
}

// ─── 5. Edge Function de administração ───────────────────────────────────
step(5, 'Edge Function admin-storage')
try {
  const res = await fetch(`${URL_}/functions/v1/admin-storage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: ANON, Authorization: `Bearer ${ANON}` },
    body: JSON.stringify({ action: 'delete', keys: [] }),
  })
  if (res.status === 401) ok('deployed e a recusar quem não fez login (é o que se quer)')
  else if (res.status === 404) bad('não está deployed', 'supabase functions deploy admin-storage')
  else if (res.status === 200) {
    bad('ACEITOU um pedido só com a chave anónima', 'Refaz o deploy SEM --no-verify-jwt')
  } else bad(`resposta inesperada: HTTP ${res.status}`)
} catch (e) {
  bad(`falhou: ${e.message}`)
}

// ─── 6. Cadeia completa até ao R2 ────────────────────────────────────────
step(6, 'Login de admin e upload para o R2')
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  skip('ADMIN_EMAIL / ADMIN_PASSWORD não definidos — a saltar o teste mais completo')
  skip('Corre:  ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run setup:check')
} else {
  let token = null
  try {
    const res = await rest('/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    })
    const body = await res.json()
    if (res.ok && body.access_token) {
      token = body.access_token
      ok(`login como ${ADMIN_EMAIL}`)
    } else {
      bad(`login falhou: ${body.error_description ?? body.msg ?? res.status}`,
          'Authentication → Users → Add user (confirma o email se for pedido)')
    }
  } catch (e) {
    bad(`login falhou: ${e.message}`)
  }

  if (token) {
    let signed = null
    try {
      const res = await fetch(`${URL_}/functions/v1/admin-storage`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          apikey: ANON,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'upload-url',
          galleryId: '__teste__',
          fileName: 'teste-setup.txt',
          contentType: 'text/plain',
          kind: 'full',
        }),
      })
      const body = await res.json()
      if (res.ok && body.url) {
        signed = body
        ok('a função assinou um upload (credenciais do R2 a funcionar)')
      } else {
        bad(`não assinou: HTTP ${res.status} ${JSON.stringify(body)}`,
            'Faltam secrets do R2: supabase secrets set R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... R2_BUCKET=galleries')
      }
    } catch (e) {
      bad(`falhou: ${e.message}`)
    }

    if (signed) {
      // Escrever mesmo no R2 prova que a chave tem permissão de escrita.
      try {
        const res = await fetch(signed.url, {
          method: 'PUT',
          headers: { 'content-type': 'text/plain' },
          body: 'teste de configuração NEBULA',
        })
        if (res.ok) ok('ficheiro escrito no bucket R2')
        else {
          const t = await res.text().catch(() => '')
          bad(`o R2 recusou a escrita: HTTP ${res.status}`,
              t.includes('SignatureDoesNotMatch')
                ? 'Access Key / Secret errados nos secrets'
                : 'Confirma o nome do bucket e que o token tem permissão de escrita')
        }
      } catch (e) {
        bad(`escrita falhou: ${e.message}`)
      }

      // CORS: sem isto o upload funciona daqui mas falha no browser.
      try {
        const res = await fetch(signed.url, {
          method: 'OPTIONS',
          headers: {
            Origin: 'https://danielrovisco.github.io',
            'Access-Control-Request-Method': 'PUT',
            'Access-Control-Request-Headers': 'content-type',
          },
        })
        const allow = res.headers.get('access-control-allow-origin')
        if (allow) ok(`CORS configurado (permite ${allow})`)
        else {
          bad('CORS por configurar no bucket',
              'R2 → bucket → Settings → CORS policy (ver README). Sem isto o upload falha SÓ no browser.')
        }
      } catch (e) {
        bad(`teste de CORS falhou: ${e.message}`)
      }

      // Limpar o ficheiro de teste.
      try {
        const res = await fetch(`${URL_}/functions/v1/admin-storage`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', apikey: ANON, Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: 'delete', keys: [signed.key] }),
        })
        if (res.ok) ok('ficheiro de teste apagado')
        else skip(`ficheiro de teste ficou no bucket: ${signed.key}`)
      } catch {
        skip(`ficheiro de teste ficou no bucket: ${signed.key}`)
      }
    }
  }
}

console.log(
  failures
    ? `\n\x1b[31m${failures} passo(s) por resolver.\x1b[0m Vê as sugestões acima.\n`
    : '\n\x1b[32mTudo configurado.\x1b[0m Já podes tirar o modo de demonstração do workflow.\n',
)
process.exit(failures ? 1 : 0)
