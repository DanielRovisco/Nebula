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
//   <nome>-{480,960,1440}.avif   — servidos via srcset, primeira escolha
//   <nome>-{480,960,1440}.webp   — servidos via srcset, para quem não lê AVIF
//   <nome>.jpg                   — fallback recomprimido para browsers sem WebP
//
// Os derivados são versionados no repo para que o deploy do GitHub Pages não
// precise do sharp. Correr este script sempre que se adicionar uma foto nova.
import { readdir, mkdir, stat, writeFile, rm } from 'node:fs/promises'
import { join, parse } from 'node:path'
import sharp from 'sharp'

const SRC = 'originals/portfolio'
const OUT = 'public/brand/portfolio'
/*
  As larguras que se tentam, da mais pequena à maior.

  Passou a haver 2160 e 2880 porque um portátil com ecrã de retina desenha a
  entrada do site num espaço de 1440 pontos com dois pixels cada: pedir-lhe uma
  imagem de 1440 é dar-lhe metade da resolução que ele mostra, e é isso que se
  vê como uma fotografia mole logo no primeiro ecrã.

  Nenhuma é inventada. De uma origem de 1440 saem três ficheiros e mais nenhum;
  de uma de 6000 saem os cinco. Qual delas existe para cada fotografia fica
  escrito no `imagens.json`, e é de lá que o <Picture> lê o srcset — sem isso,
  anunciar uma largura que não existe manda o browser buscar um 404, ou pior,
  buscar um ficheiro de 1440 a dizer que tem 2880.
*/
const WIDTHS = [480, 960, 1440, 2160, 2880]

/*
  Qualidade.

  Subiu, e o AVIF é o número que conta, porque é o formato que quase toda a
  gente recebe: de 55 para 65 leva a fotografia de entrada de 69 kB para 108.

  Fica em 65 e não mais, e não é por gosto redondo. O codificador tem um degrau
  entre 65 e 68: 108 kB de um lado, 219 kB do outro, para uma diferença que não
  se vê num ecrã. Duplicar o peso da imagem que decide a velocidade da página
  por causa disso seria pagar caro por nada. Quem mexer nisto outra vez, meça
  antes de subir — a escala não é linear e o salto não avisa.

  No WebP o mesmo: de 86 para 92 passa de 193 kB para 440.
*/
const Q_WEBP = 86
const Q_AVIF = 65
const Q_JPEG = 86

await mkdir(OUT, { recursive: true })

const files = (await readdir(SRC)).filter((f) => /\.(jpe?g|png)$/i.test(f))
if (files.length === 0) {
  console.error(`Sem originais em ${SRC}/`)
  process.exit(1)
}

let before = 0
let after = 0

/** Que larguras existem mesmo, por fotografia. Lido depois pelo <Picture>. */
const disponiveis = {}

for (const file of files) {
  const { name } = parse(file)
  const input = join(SRC, file)
  before += (await stat(input)).size

  const meta = await sharp(input).metadata()

  /*
    Só as larguras que a origem consegue dar de verdade, e uma a mais com o
    tamanho exacto dela quando sobra resolução por aproveitar.

    O número no nome do ficheiro é também o que se anuncia no srcset, por isso
    tem de ser a largura verdadeira. Guardar uma imagem de 1638 pixels num
    ficheiro chamado 2160 é mentir ao browser sobre o que ele está a escolher:
    ele passa a preferi-la para um ecrã onde ela não chega, que é exactamente o
    defeito que se está aqui a corrigir. Foi o que aconteceu à primeira versão
    disto, e só se viu ao ler o que o gerador escreveu.

    O `1.1` evita um ficheiro quase igual ao anterior: uma origem de 1500 não
    merece um segundo ficheiro logo a seguir ao de 1440.
  */
  const cabem = WIDTHS.filter((w) => w <= meta.width)
  const maior = cabem[cabem.length - 1] ?? 0
  const larguras = meta.width > maior * 1.1 ? [...cabem, meta.width] : cabem
  disponiveis[name] = larguras

  /*
    Apaga os derivados que deixaram de fazer parte da lista.

    Sem isto, mudar as regras deixa ficheiros antigos para trás a dizer coisas
    que já não são verdade — foi o que aconteceu aqui: uma origem de 1023
    pixels tinha um ficheiro chamado 1440, de uma versão anterior deste script
    que arredondava para cima. Ninguém dava por ele, e o srcset apontava-lhe.
  */
  for (const w of WIDTHS) {
    if (larguras.includes(w)) continue
    for (const ext of ['webp', 'avif']) {
      await rm(join(OUT, `${name}-${w}.${ext}`), { force: true })
    }
  }

  for (const width of larguras) {
    // Nunca fazer upscale: a largura pedida é limitada pela do original.
    const target = Math.min(width, meta.width)
    const out = join(OUT, `${name}-${width}.webp`)
    await sharp(input)
      .resize({ width: target, withoutEnlargement: true })
      .webp({ quality: Q_WEBP, effort: 6 })
      .toFile(out)
    after += (await stat(out)).size

    // AVIF a acompanhar cada WebP: bastante mais leve com a mesma qualidade
    // aparente. O <picture> oferece-o primeiro e quem não o souber ler cai no
    // WebP — daí não substituir, acrescentar.
    const avif = join(OUT, `${name}-${width}.avif`)
    await sharp(input)
      .resize({ width: target, withoutEnlargement: true })
      .avif({ quality: Q_AVIF, effort: 4 })
      .toFile(avif)
    after += (await stat(avif)).size
  }

  const fallback = join(OUT, `${name}.jpg`)
  await sharp(input)
    .resize({ width: Math.min(1440, meta.width), withoutEnlargement: true })
    .jpeg({ quality: Q_JPEG, progressive: true, mozjpeg: true })
    .toFile(fallback)
  after += (await stat(fallback)).size

  console.log(`${name}  ${meta.width}x${meta.height}  →  ${larguras.join(', ')}`)
}

/*
  O mapa do que existe, escrito para o código o poder ler.

  Fica em src/ e não em public/ de propósito: é importado no build, por isso
  entra no bundle como um objecto e não custa um pedido à rede. E é gerado, não
  escrito à mão, porque uma lista destas mantida à mão fica errada na primeira
  fotografia nova, em silêncio, e o erro só aparece como um 404 no browser de
  um visitante.
*/
await writeFile(
  'src/lib/imagens.json',
  JSON.stringify(Object.fromEntries(Object.entries(disponiveis).sort()), null, 2) + '\n',
)

/*
  O total dos derivados, sem a comparação que aqui não quer dizer nada.

  Dizia "x% menos" que o original, e com a qualidade mais alta o número passou a
  ser negativo: "-116% menos", que não significa coisa nenhuma. E mesmo positivo
  era enganador, porque ninguém descarrega os derivados todos: cada visitante
  leva uma largura e um formato de cada fotografia que vê. O que se quer saber
  aqui é o peso da pasta; o que interessa a quem visita mede-se no browser.
*/
const mb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`
console.log(`\n${files.length} imagens · ${mb(before)} de origens → ${mb(after)} em derivados`)
