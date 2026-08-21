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
import { readFile, writeFile, unlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/*
  fileURLToPath e não `.pathname`: no Windows o pathname de um file:// vem
  como `/C:/Users/...`, com barra à frente, e o Windows lê isso como raiz da
  unidade actual — juntava-lhe outro `C:` e dava `C:\C:\Users\...`. Em Linux
  o pathname calha ser um caminho válido, por isso nada disto aparecia aqui.
*/
const raiz = fileURLToPath(new URL('../', import.meta.url))
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

/*
  `command -v` é do shell do Unix e não existe no Windows, onde devolvia
  sempre erro — ou seja, dizia "não instalado" mesmo com o programa presente,
  e o passo era saltado sem explicação possível. No Windows pergunta-se ao
  `where`.
*/
function temComando(cmd) {
  const procura = process.platform === 'win32' ? 'where' : 'command -v'
  try {
    execSync(`${procura} ${cmd}`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/*
  O CLI do Supabase já não se instala globalmente pelo npm — eles bloquearam.
  Ou está no PATH (Scoop, Homebrew, binário), ou se chama pelo `npx`, que o
  descarrega na hora. O `npx` no Windows é um .cmd, e o Node recusa-se a
  executar .cmd sem shell desde a correcção de segurança do ano passado.
*/
const win = process.platform === 'win32'

/*
  `shell: win` nos dois ramos, e não só no do npx. Em Windows tanto o
  `supabase` instalado como o `npx` são ficheiros .cmd, e o Node recusa-se a
  executar .cmd sem shell desde a correcção de segurança do ano passado — a
  chamada morre antes de arrancar, sem uma linha de output, o que faz o erro
  parecer do Supabase quando é da forma de o chamar.
*/
const CLI = temComando('supabase')
  ? { exe: win ? 'supabase.cmd' : 'supabase', pre: [], shell: win }
  : temComando('npx')
    ? { exe: win ? 'npx.cmd' : 'npx', pre: ['--yes', 'supabase'], shell: win }
    : null

/*
  Com shell ligado, o Node junta os argumentos numa linha só sem os proteger.
  Um caminho com espaços — e `C:\Users\Nome Apelido\...` é vulgar — partia-se
  em dois. Aspas em quem precisa delas.
*/
const proteger = (a) => (CLI.shell && /[\s&|<>^]/.test(a) ? `"${a}"` : a)

/*
  Com shell, monta-se a linha aqui em vez de passar um array com
  `shell: true` — é essa combinação que o Node assinala como DEP0190, porque
  junta os argumentos sem os escapar. Fazendo a linha nós, as aspas do
  `proteger` são realmente aplicadas e o aviso deixa de fazer sentido.
*/
const supa = (args, opcoes = {}) => {
  const todos = [...CLI.pre, ...args]
  return CLI.shell
    ? execSync([CLI.exe, ...todos].map(proteger).join(' '), { stdio: 'inherit', ...opcoes })
    : execFileSync(CLI.exe, todos, { stdio: 'inherit', ...opcoes })
}

/*
  Um "falhou" sem mais nada é pior do que não dizer nada: dá a entender que
  se sabe o que correu mal. Estas duas linhas mostram o comando exacto e a
  razão, que é o que permite a quem está do outro lado resolver o problema.
*/
function porque(e) {
  const partes = [e?.status !== undefined && e.status !== null ? `saiu com ${e.status}` : '', e?.code, e?.message]
  return partes.filter(Boolean).join(' · ') || 'razão desconhecida'
}
const comandoEscrito = (args) => [CLI.exe, ...CLI.pre, ...args].join(' ')

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

/*
  A página do Supabase mostra hoje o endereço da API REST — acaba em
  `/rest/v1` — e é esse que se copia por instinto. O que o site precisa é da
  raiz. Colado com o caminho, tudo o que se constrói a partir dali fica torto:
  o schema parece não existir, as funções parecem não estar publicadas e o
  login dá 404. Um erro só, com quatro sintomas que apontam para lados
  diferentes. Limpa-se aqui, em vez de se confiar em quem copia.
*/
const limpaUrlSupabase = (u) =>
  u.trim().replace(/\/+$/, '').replace(/\/(rest|auth|storage|functions|realtime)\/v\d+$/, '')

const supabaseUrl = limpaUrlSupabase(
  await pergunta('Project URL do Supabase', { atual: env.VITE_SUPABASE_URL }),
)
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
if (CLI) console.log(cor('90', `  CLI: ${[CLI.exe, ...CLI.pre].join(' ')}`))

if (!CLI) {
  aviso('não encontrei o CLI do Supabase nem o npx.')
  console.log(cor('90', '    O npm install -g supabase já não é suportado por eles.'))
  console.log(cor('90', '    Windows:  scoop install supabase'))
  console.log(cor('90', '    macOS:    brew install supabase/tap/supabase'))
  console.log(cor('90', '    Depois:   supabase login && supabase link'))
} else {
  const accountId = await pergunta('R2 Account ID')
  const keyId = await pergunta('R2 Access Key ID')
  const secret = await pergunta('R2 Secret Access Key')
  const bucket = await pergunta('Bucket privado (galerias)', { atual: 'galleries' })
  const bucketPublico = await pergunta('Bucket público (site)', { atual: 'nebula-site' })
  // Buckets criados com jurisdição respondem noutro endereço. Assinar contra o
  // errado devolve "bucket não encontrado", que manda procurar no sítio errado.
  console.log(cor('90', '  Se criaste os buckets com "Specify jurisdiction", escreve a jurisdição'))
  console.log(cor('90', '  (eu). Se escolheste "Automatic", deixa vazio.'))
  const jurisdicao = await pergunta('Jurisdição do R2 (vazio se Automatic)', {
    obrigatorio: false,
    atual: 'eu',
  })

  /*
    Os segredos vão num ficheiro e não na linha de comando. Duas razões: uma
    linha de comando é visível na lista de processos e fica no histórico da
    shell, e o secret do R2 pode trazer caracteres que o shell do Windows
    interpretaria. O ficheiro é apagado a seguir, aconteça o que acontecer.
  */
  const ficheiroSecrets = raiz + '.r2-secrets.tmp'
  try {
    await writeFile(
      ficheiroSecrets,
      [
        `R2_ACCOUNT_ID=${accountId}`,
        `R2_ACCESS_KEY_ID=${keyId}`,
        `R2_SECRET_ACCESS_KEY=${secret}`,
        `R2_BUCKET=${bucket}`,
        `R2_PUBLIC_BUCKET=${bucketPublico}`,
        `R2_JURISDICTION=${jurisdicao}`,
        '',
      ].join('\n'),
      { mode: 0o600 },
    )
    supa(['secrets', 'set', '--env-file', ficheiroSecrets])
    ok('secrets guardados no Supabase')
  } catch (e) {
    erro('não foi possível guardar os secrets')
    console.log(cor('90', `    comando: ${comandoEscrito(['secrets', 'set', '--env-file', '<ficheiro>'])}`))
    console.log(cor('90', `    ${porque(e)}`))
    console.log(cor('90', '    Se falar em project ref, falta `supabase link`.'))
    console.log(cor('90', '    Se falar em token ou login, falta `supabase login`.'))
  } finally {
    await unlink(ficheiroSecrets).catch(() => {})
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
      supa(['functions', 'deploy', nome, ...(semJwt ? ['--no-verify-jwt'] : [])])
      ok(`função ${nome} publicada`)
    } catch (e) {
      erro(`falhou a publicar ${nome}`)
      console.log(cor('90', `    comando: ${comandoEscrito(['functions', 'deploy', nome])}`))
      console.log(cor('90', `    ${porque(e)}`))
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
// A forma `VAR=valor comando` é do shell do Unix: no PowerShell o `npm` não
// chega a receber nada e o teste falha a dizer que faltam credenciais.
if (win) {
  console.log(cor('90', '    $env:ADMIN_EMAIL="..."; $env:ADMIN_PASSWORD="..."; npm run setup:check'))
} else {
  console.log(cor('90', '    ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run setup:check'))
}
console.log('\n  Falta ainda, no GitHub (Settings → Secrets → Actions):')
console.log(cor('90', '    VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_R2_PUBLIC_URL'))
console.log('\n  E dizer-me para tirar o modo de demonstração do deploy.\n')

rl.close()
