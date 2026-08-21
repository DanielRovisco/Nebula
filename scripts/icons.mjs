/**
 * Gera os ícones do site a partir do símbolo da marca.
 *
 * O símbolo original é branco sobre transparente, o que serve para o site mas
 * não para ícones: guardado no ecrã de um telemóvel, um PNG transparente fica
 * branco sobre branco — ou seja, um quadrado vazio. Aqui o fundo `eerie` é
 * pintado por baixo, que é como a marca aparece em todo o lado.
 *
 * Correr quando o símbolo mudar: `npm run icons`.
 */
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const ORIGEM = fileURLToPath(new URL('../public/brand/logo-symbol-white.png', import.meta.url))
const DESTINO = fileURLToPath(new URL('../public/icons/', import.meta.url))
const FUNDO = { r: 0x19, g: 0x19, b: 0x19, alpha: 1 }

/**
 * Um ícone quadrado com o símbolo centrado.
 *
 * `margem` é a fração do lado deixada em branco à volta. Nos ícones normais é
 * pequena; no `maskable` do Android tem de ser generosa, porque o sistema
 * recorta o ícone à forma que quiser (círculo, quadrado redondo, gota) e o que
 * ficar perto da borda desaparece.
 */
async function icone(tamanho, ficheiro, margem = 0.18) {
  const interior = Math.round(tamanho * (1 - margem * 2))
  // `trim` primeiro: o PNG de origem tem muito transparente à volta do símbolo,
  // e sem o aparar o que fica centrado é a caixa da imagem — não o desenho.
  const simbolo = await sharp(ORIGEM)
    .trim()
    .resize(interior, interior, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()

  await sharp({
    create: { width: tamanho, height: tamanho, channels: 4, background: FUNDO },
  })
    .composite([{ input: simbolo, gravity: 'center' }])
    .png()
    .toFile(DESTINO + ficheiro)

  console.log(`  ${ficheiro.padEnd(24)} ${tamanho}×${tamanho}`)
}

await mkdir(DESTINO, { recursive: true })
await icone(32, 'favicon-32.png', 0.08)
await icone(180, 'apple-touch-icon.png', 0.14)
await icone(192, 'icon-192.png', 0.14)
await icone(512, 'icon-512.png', 0.14)
// O Android recorta este à vontade dele: 25% de margem de cada lado garante
// que o símbolo sobrevive a qualquer forma.
await icone(512, 'icon-maskable-512.png', 0.25)
console.log('\nÍcones gerados em public/icons/.')
