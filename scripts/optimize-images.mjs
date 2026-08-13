// Gera derivados responsivos (WebP + JPEG de fallback) a partir dos originais
// em originals/portfolio/.
//
// Os originais vivem FORA de public/ de propósito: tudo o que está em public/ é
// copiado para dist/ e publicado, e não há razão para servir ao visitante os
// ficheiros de origem (eram 6,4 MB de deploy morto).
//
//   npm run images
//
// Para cada original produz, em public/brand/portfolio/:
//   <nome>-{480,960,1440}.webp   — servidos via srcset
//   <nome>.jpg                   — fallback recomprimido para browsers sem WebP
//
// Os derivados são versionados no repo para que o deploy do GitHub Pages não
// precise do sharp. Correr este script sempre que se adicionar uma foto nova.
import { readdir, mkdir, stat } from 'node:fs/promises'
import { join, parse } from 'node:path'
import sharp from 'sharp'

const SRC = 'originals/portfolio'
const OUT = 'public/brand/portfolio'
const WIDTHS = [480, 960, 1440]

await mkdir(OUT, { recursive: true })

const files = (await readdir(SRC)).filter((f) => /\.(jpe?g|png)$/i.test(f))
if (files.length === 0) {
  console.error(`Sem originais em ${SRC}/`)
  process.exit(1)
}

let before = 0
let after = 0

for (const file of files) {
  const { name } = parse(file)
  const input = join(SRC, file)
  before += (await stat(input)).size

  const meta = await sharp(input).metadata()

  for (const width of WIDTHS) {
    // Nunca fazer upscale: a largura pedida é limitada pela do original.
    const target = Math.min(width, meta.width)
    const out = join(OUT, `${name}-${width}.webp`)
    await sharp(input)
      .resize({ width: target, withoutEnlargement: true })
      .webp({ quality: 78, effort: 6 })
      .toFile(out)
    after += (await stat(out)).size
  }

  const fallback = join(OUT, `${name}.jpg`)
  await sharp(input)
    .resize({ width: Math.min(1440, meta.width), withoutEnlargement: true })
    .jpeg({ quality: 78, progressive: true, mozjpeg: true })
    .toFile(fallback)
  after += (await stat(fallback)).size

  console.log(`${name}  ${meta.width}x${meta.height}`)
}

const mb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`
console.log(
  `\n${files.length} imagens · originais ${mb(before)} → derivados ${mb(after)} ` +
    `(${Math.round((1 - after / before) * 100)}% menos)`,
)
