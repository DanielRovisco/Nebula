import { simbolo } from '../qr/simbolo'

/**
 * Prepara uma fotografia para a mostra da estação de impressão.
 *
 * Isto é a peça que faz a promessa de "não dá para descarregar" ser verdade, e
 * vale a pena perceber porquê, porque é o contrário do que se costuma tentar.
 *
 * Não há maneira nenhuma de mostrar uma imagem num browser e impedir que ela
 * seja guardada. Os bytes têm de chegar ao aparelho para aparecerem no ecrã, e
 * a partir daí pertencem a quem lá está: o menu do botão direito desliga-se, a
 * consola não, e quem souber abrir o inspector tem o ficheiro em dois cliques.
 * Qualquer defesa construída no browser é um aviso, não um cadeado.
 *
 * Por isso a defesa não está no browser: está no ficheiro. O que sobe para o
 * servidor já vem reduzido a uns 800 pixels e já leva o número e a nossa marca
 * queimados nos pixels. Não existe versão grande em lado nenhum, nem atrás de
 * uma permissão nem atrás de um URL difícil de adivinhar. Quem extrair a
 * imagem extrai exactamente o que decidimos mostrar: uma prova pequena e
 * marcada, que serve para a pessoa se ver e não serve para imprimir em casa,
 * que é o objectivo.
 *
 * O original nunca sai do portátil de quem carrega.
 */

/*
  O lado maior da imagem que o convidado vê.

  Oitocentos e vinte é o resultado de duas contas opostas. Num telemóvel de 390
  pontos com três pixels cada, uma imagem em ecrã cheio pede cerca de 1170: a
  820 fica ligeiramente macia com o zoom no máximo, e perfeitamente nítida ao
  tamanho a que se olha para ela. Impressa a 10 por 15 centímetros dá menos de
  140 pontos por polegada, que é o suficiente para se ver que foi tirada de um
  ecrã. É esse o ponto: boa para olhar, má para roubar.
*/
const LADO_VER = 820

/*
  A miniatura da grelha. Numa rede de casamento é isto que decide se a página
  abre ou fica a girar: a 360 pesa uns 20 kB, e quarenta e oito delas cabem no
  que uma única fotografia grande ocuparia.
*/
const LADO_THUMB = 360

// WebP e não JPEG: ao mesmo aspecto pesa cerca de um terço menos, e menos bytes
// numa rede má é a diferença entre ver e desistir.
const TIPO = 'image/webp'
const QUALIDADE_VER = 0.72
const QUALIDADE_THUMB = 0.6

export interface Preparada {
  ver: Blob
  thumb: Blob
  width: number
  height: number
}

/** Lado maior reduzido a `lado`, mantendo a proporção. Nunca aumenta. */
function medida(w: number, h: number, lado: number) {
  const f = Math.min(1, lado / Math.max(w, h))
  return { w: Math.max(1, Math.round(w * f)), h: Math.max(1, Math.round(h * f)) }
}

/**
 * O número, numa chapa no canto inferior esquerdo.
 *
 * Num canto e não ao centro porque a fotografia é de pessoas e é para elas se
 * verem; uma marca no meio da cara não serve a ninguém. A chapa escura por
 * trás existe porque um número branco sobre um vestido branco não se lê, e
 * este número é a única coisa que o convidado tem de conseguir dizer ao
 * operador.
 */
function carimbar(
  ctx: CanvasRenderingContext2D,
  largura: number,
  altura: number,
  numero: number,
  marca: HTMLImageElement | null,
) {
  const escala = Math.max(largura, altura) / 820
  const texto = String(numero).padStart(3, '0')
  const corpo = Math.round(34 * escala)
  const margem = Math.round(18 * escala)

  ctx.font = `600 ${corpo}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`
  ctx.textBaseline = 'middle'
  const largo = ctx.measureText(texto).width
  const chapaW = largo + corpo * 0.9
  const chapaH = corpo * 1.55
  const x = margem
  const y = altura - margem - chapaH

  ctx.save()
  ctx.fillStyle = 'rgba(12,12,12,0.66)'
  ctx.beginPath()
  ctx.roundRect(x, y, chapaW, chapaH, chapaH / 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(252,255,240,0.96)'
  ctx.textAlign = 'center'
  ctx.fillText(texto, x + chapaW / 2, y + chapaH / 2 + corpo * 0.03)
  ctx.restore()

  /*
    O símbolo no canto oposto, discreto.

    Não é para enfeitar: é o que faz uma captura de ecrã desta fotografia
    continuar a dizer de onde veio, depois de passar por três conversas de
    grupo. Sem símbolo carimba-se na mesma o número, que é o que a mesa precisa.
  */
  if (marca) {
    const alto = Math.round(26 * escala)
    const largoM = (marca.width / marca.height) * alto
    ctx.save()
    ctx.globalAlpha = 0.55
    ctx.drawImage(marca, largura - margem - largoM, altura - margem - alto, largoM, alto)
    ctx.restore()
  }
}

async function paraBlob(canvas: HTMLCanvasElement, qualidade: number): Promise<Blob> {
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, TIPO, qualidade))
  if (!blob) throw new Error('nao_converteu')
  return blob
}

/**
 * Do ficheiro original às duas imagens que vão para o servidor.
 *
 * `imageOrientation: 'from-image'` não é um detalhe: sem ele, metade das
 * fotografias tiradas na vertical chegam deitadas, porque a rotação vive no
 * EXIF e o canvas ignora-o. Numa mesa de impressão isso seria metade da noite
 * com as fotografias de lado.
 */
export async function prepararFoto(ficheiro: File, numero: number): Promise<Preparada> {
  const bitmap = await createImageBitmap(ficheiro, { imageOrientation: 'from-image' })
  const marca = await simbolo('branco')

  try {
    const desenhar = async (lado: number, qualidade: number, comCarimbo: boolean) => {
      const { w, h } = medida(bitmap.width, bitmap.height, lado)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('sem_canvas')
      // Sem isto, reduzir para um terço do tamanho serrilha as linhas finas.
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(bitmap, 0, 0, w, h)
      if (comCarimbo) carimbar(ctx, w, h, numero, marca)
      return { blob: await paraBlob(canvas, qualidade), w, h }
    }

    /*
      As duas levam o número. A miniatura também, e de propósito: é na grelha
      que a pessoa procura a sua fotografia e lê o número para dizer ao
      operador, e obrigá-la a abrir cada uma para o descobrir seria trabalho a
      mais numa fila.
    */
    const ver = await desenhar(LADO_VER, QUALIDADE_VER, true)
    const thumb = await desenhar(LADO_THUMB, QUALIDADE_THUMB, true)

    return { ver: ver.blob, thumb: thumb.blob, width: ver.w, height: ver.h }
  } finally {
    // Um bitmap por fotografia, e uma mesa de impressão carrega centenas: sem
    // isto a memória do portátil vai toda antes do fim da noite.
    bitmap.close()
  }
}
