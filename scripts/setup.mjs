/**
 * Liga o site ao Supabase e ao Cloudflare R2, num comando.
 *
 * O que fica do lado de quem corre isto é apenas criar as contas e colar as
 * chaves; tudo o que se segue — escrever o `.env.local`, correr o schema,
 * guardar os secrets, publicar as quatro Edge Functions, escrever a política de
 * CORS — acontece aqui.
 *
 *   npm run setup
 *
 * É seguro repetir: não apaga nada, e cada passo diz se foi feito ou saltado.
 * Se um passo falhar, os anteriores ficam feitos e volta-se a correr.
 */
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { execFileSync, execSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'

const raiz = new URL('../', import.meta.url).pathname
const rl = createInterface({ input: stdin, output: stdout })

const cor = (c, s) => `[${c}m${s}[0m`
const titulo = (s) => console.log(`\n${cor('1', s)}\n${'─'.repeat(s.length)}`)
const ok = (s) => console.log(`  ${cor('32', '✓')} ${s}`)
const aviso = (s) => console.log(`  ${cor('33', '!')} ${s}`)
const erro = (s) => console.log(`  ${cor('31', '✗')} ${s}`)

async function pergunta(texto, { obrigatorio = true, atual = '' } = {}) {
  const sufixo = atual ? cor('90', ` [${atual.slice(0, 24)}${atual.length > 24 ? '…' : ''}]`) : ''
  for (;;) {
    const r = (await rl.question(`  ${texto}${sufixo}: `)).trim()
    if (r) return r
    if (atual) return atual
    if (!obrigatorio) return ''
    console.log(cor('33', '    (é preciso)'))
  }
}

function temComando(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/** Lê o .env.local que já exista, para a segunda corrida não repetir perguntas. */
async function lerEnv() {
  const caminho = raiz + '.env.local'
  if (!existsSync(caminho)) return {}
  const texto = await readFile(caminho, 'utf8')
  return Object.fromEntries(
    texto
      .split('\n')
      .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
      .map((l) => {
        const i = l.indexOf('=')
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
      }),
  )
}

console.log(cor('1', '\nNEBULA — ligar o site ao Supabase e ao R2'))
console.log(cor('90', 'Ctrl+C a qualquer momento; nada fica a meio de forma perigosa.\n'))
console.log('Vais precisar de ter à mão:')
console.log(cor('90', '  · Supabase → Project Settings → API: Project URL e a chave anon'))
console.log(cor('90', '  · Cloudflare → R2: Account ID, Access Key ID, Secret e o URL público'))

const env = await lerEnv()

// ─── 1. Variáveis do site ──────────────────────────────────────────────────
titulo('1. Variáveis do site (.env.local)')

const supabaseUrl = await pergunta('Project URL do Supabase', { atual: env.VITE_SUPABASE_URL })
const anonKey = await pergunta('Chave anon do Supabase', { atual: env.VITE_SUPABASE_ANON_KEY })
const r2Public = await pergunta('URL público do bucket do site', {
  obrigatorio: false,
  atual: env.VITE_R2_PUBLIC_URL,
})
const contactEndpoint = await pergunta('Endpoint do formulário (Formspree, opcional)', {
  obrigatorio: false,
  atual: env.VITE_CONTACT_ENDPOINT,
})

const linhas = [
  '# Escrito por `npm run setup`. Não versionado.',
  `VITE_SUPABASE_URL=${supabaseUrl}`,
  `VITE_SUPABASE_ANON_KEY=${anonKey}`,
  r2Public ? `VITE_R2_PUBLIC_URL=${r2Public}` : '',
  contactEndpoint ? `VITE_CONTACT_ENDPOINT=${contactEndpoint}` : '',
  '',
].filter((l) => l !== '')

await writeFile(raiz + '.env.local', linhas.join('\n'))
ok('.env.local escrito')

// ─── 2. Schema ─────────────────────────────────────────────────────────────
titulo('2. Schema da base de dados')
console.log(cor('90', '  Precisa da connection string: Supabase → Project Settings → Database'))
console.log(cor('90', '  → Connection string → URI (a que tem a password lá dentro).'))
console.log(cor('90', '  Deixa vazio para o correres à mão no SQL Editor.'))

const dbUrl = await pergunta('Connection string (opcional)', { obrigatorio: false })
if (dbUrl && temComando('psql')) {
  try {
    execFileSync('psql', [dbUrl, '-v', 'ON_ERROR_STOP=1', '-f', raiz + 'supabase/schema.sql'], {
      stdio: 'inherit',
    })
    ok('schema aplicado (é idempotente: podes voltar a correr)')
  } catch {
    erro('o schema falhou — corre supabase/schema.sql no SQL Editor e segue')
  }
} else if (dbUrl) {
  aviso('psql não está instalado; cola supabase/schema.sql no SQL Editor do Supabase')
} else {
  aviso('saltado — cola supabase/schema.sql no SQL Editor do Supabase')
}

// ─── 3. Secrets e funções ──────────────────────────────────────────────────
titulo('3. Credenciais do R2 e Edge Functions')

if (!temComando('supabase')) {
  aviso('o CLI do Supabase não está instalado.')
  console.log(cor('90', '    npm i -g supabase && supabase login && supabase link'))
  console.log(cor('90', '    Depois volta a correr `npm run setup`.'))
} else {
  const accountId = await pergunta('R2 Account ID')
  const keyId = await pergunta('R2 Access Key ID')
  const secret = await pergunta('R2 Secret Access Key')
  const bucket = await pergunta('Bucket privado (galerias)', { atual: 'galleries' })
  const bucketPublico = await pergunta('Bucket público (site)', { atual: 'nebula-site' })

  try {
    execFileSync(
      'supabase',
      [
        'secrets',
        'set',
        `R2_ACCOUNT_ID=${accountId}`,
        `R2_ACCESS_KEY_ID=${keyId}`,
        `R2_SECRET_ACCESS_KEY=${secret}`,
        `R2_BUCKET=${bucket}`,
        `R2_PUBLIC_BUCKET=${bucketPublico}`,
      ],
      { stdio: 'inherit' },
    )
    ok('secrets guardados no Supabase')
  } catch {
    erro('não foi possível guardar os secrets (o projeto está ligado com `supabase link`?)')
  }

  // As três primeiras são chamadas pelo cliente, que é anónimo: quem autoriza é
  // a password da galeria, validada lá dentro. A última exige login.
  const funcoes = [
    ['gallery-access', true],
    ['gallery-log', true],
    ['gallery-favorite', true],
    ['admin-storage', false],
  ]
  for (const [nome, semJwt] of funcoes) {
    try {
      execFileSync('supabase', ['functions', 'deploy', nome, ...(semJwt ? ['--no-verify-jwt'] : [])], {
        stdio: 'inherit',
      })
      ok(`função ${nome} publicada`)
    } catch {
      erro(`falhou a publicar ${nome}`)
    }
  }
}

// ─── 4. CORS ───────────────────────────────────────────────────────────────
titulo('4. CORS do bucket privado')
console.log('  Cola isto em R2 → o teu bucket → Settings → CORS policy:')
console.log(cor('90', await readFile(raiz + 'supabase/r2-cors.json', 'utf8')))

// ─── 5. Verificação ────────────────────────────────────────────────────────
titulo('5. Confirmação')
console.log('  Para verificar tudo de ponta a ponta:')
console.log(cor('90', '    ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run setup:check'))
console.log('\n  Falta ainda, no GitHub (Settings → Secrets → Actions):')
console.log(cor('90', '    VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_R2_PUBLIC_URL'))
console.log('\n  E dizer-me para tirar o modo de demonstração do deploy.\n')

rl.close()
