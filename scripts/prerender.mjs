/**
 * Pré-renderização das páginas públicas.
 *
 * O site é uma SPA: o HTML servido é sempre o mesmo casco vazio e o conteúdo —
 * incluindo o title, a description e o canonical — é escrito pelo JavaScript.
 * O Googlebot executa JavaScript, mas quase mais ninguém o faz: as
 * pré-visualizações de links do WhatsApp, do Instagram, do Slack e boa parte
 * dos outros crawlers leem o HTML tal como vem e ficam com o título genérico.
 *
 * Em vez de reescrever a aplicação para renderizar no servidor, abre-se o site
 * já construído num browser verdadeiro e guarda-se o HTML resultante de cada
 * página. É a mesma aplicação, com o mesmo comportamento — não há duas versões
 * do código para manter em sincronia.
 *
 * O browser corre com `prefers-reduced-motion`, e isso não é um detalhe: sem
 * isso a captura apanhava as animações a meio, com metade do conteúdo em
 * opacidade zero e a abertura do site por cima de tudo. Com a preferência
 * ativa, o site entrega-se estático e completo — que é exatamente o que
 * queremos guardar.
 *
 * Correr depois do build: `npm run build && npm run prerender`.
 */
import { createServer } from 'node:http'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, extname, dirname } from 'node:path'
import { chromium } from 'playwright'

const DIST = new URL('../dist/', import.meta.url).pathname
// O mesmo `base` que o Vite e o router usam. Estava fixo aqui, e com um domínio
// próprio (base "/") isso servia as páginas em /Nebula/ — o router via esse
// prefixo como parte do caminho e gravava canonicals como
// "https://nebula.pt/Nebula/".
const BASE = JSON.parse(
  await readFile(new URL('../site.config.json', import.meta.url).pathname, 'utf8'),
).base
const PORTA = 4183

// Só páginas públicas. As galerias são privadas, o painel não deve ser
// indexado, e a página de obrigado só faz sentido depois de enviar.
const ROTAS = [
  '/',
  '/sobre',
  '/servicos',
  '/portfolio',
  '/contacto',
  '/privacidade',
  '/en',
  '/en/about',
  '/en/services',
  '/en/portfolio',
  '/en/contact',
  '/en/privacy',
]

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
}

/** Servidor estático mínimo, com o mesmo fallback do GitHub Pages. */
function servir() {
  return createServer(async (req, res) => {
    const caminho = decodeURIComponent((req.url ?? '/').split('?')[0])
    const relativo = caminho.startsWith(BASE) ? caminho.slice(BASE.length) : caminho.slice(1)
    // Mesma resolução do GitHub Pages: um caminho sem extensão procura
    // primeiro <caminho>/index.html e só depois cai no casco da aplicação.
    let ficheiro = join(DIST, relativo)
    if (!extname(ficheiro)) {
      const comIndex = join(ficheiro, 'index.html')
      ficheiro = existsSync(comIndex) ? comIndex : join(DIST, 'index.html')
    } else if (!existsSync(ficheiro)) {
      ficheiro = join(DIST, 'index.html')
    }
    try {
      const dados = await readFile(ficheiro)
      res.writeHead(200, { 'content-type': MIME[extname(ficheiro)] ?? 'application/octet-stream' })
      res.end(dados)
    } catch {
      res.writeHead(404).end('404')
    }
  })
}

const servidor = servir()
await new Promise((r) => servidor.listen(PORTA, r))

// Em ambientes que já trazem o Chromium instalado (como este contentor de
// desenvolvimento), PLAYWRIGHT_CHROMIUM_PATH aponta-lhe o caminho e evita
// descarregar outro. No CI o browser é instalado pelo workflow.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined
const browser = await chromium.launch(executablePath ? { executablePath } : {})
// A preferência de menos movimento é o que faz o site entregar-se estático.
const ctx = await browser.newContext({ reducedMotion: 'reduce' })

let escritas = 0
try {
  for (const rota of ROTAS) {
    const page = await ctx.newPage()
    const erros = []
    page.on('pageerror', (e) => erros.push(e.message))

    await page.goto(`http://localhost:${PORTA}${BASE}${rota.replace(/^\//, '')}`, {
      waitUntil: 'networkidle',
    })
    // O <title> é escrito num efeito: esperar por ele é esperar pela aplicação.
    await page.waitForFunction(() => document.title && document.title !== 'NEBULA', null, {
      timeout: 10000,
    })

    // As animações de entrada não são desligadas pela preferência de menos
    // movimento (só o movimento é), e apanhar uma a meio grava `opacity: 0` no
    // HTML — conteúdo invisível para quem chega sem JavaScript. Um segundo e
    // meio chega para todas terminarem.
    await page.waitForTimeout(1500)

    if (erros.length) throw new Error(`${rota}: ${erros.join(' | ')}`)

    const html = await page.evaluate(() => `<!doctype html>\n${document.documentElement.outerHTML}`)
    if (/opacity:\s*0[;"]/.test(html)) {
      throw new Error(`${rota}: apanhou uma animação a meio (opacity: 0 no HTML)`)
    }
    if (!html.includes('<div id="root">') || html.length < 2000) {
      throw new Error(`${rota}: HTML suspeito (${html.length} bytes)`)
    }

    const destino = rota === '/' ? join(DIST, 'index.html') : join(DIST, rota.slice(1), 'index.html')
    await mkdir(dirname(destino), { recursive: true })
    await writeFile(destino, html)
    escritas++
    console.log(`  ${rota.padEnd(16)} → ${(html.length / 1024).toFixed(0)} kB`)
    await page.close()
  }
} finally {
  await browser.close()
  servidor.close()
}

console.log(`\n${escritas}/${ROTAS.length} páginas pré-renderizadas.`)
if (escritas !== ROTAS.length) process.exit(1)
