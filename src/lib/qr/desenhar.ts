/**
 * O código QR da NEBULA: módulos redondos, olhos com cantos suaves e o símbolo
 * ao centro.
 *
 * A biblioteca `qrcode` sabe desenhar um código sozinha, mas desenha-o em
 * quadrados pretos. Este ficheiro usa-a só para o cálculo — a matriz de
 * módulos, que é a parte difícil e normalizada — e faz o desenho à mão. É o
 * que permite pôr isto numa mesa de casamento sem parecer uma etiqueta de
 * armazém.
 *
 * O símbolo ao centro tapa módulos, e um código com módulos tapados só
 * continua legível por causa da correcção de erros: no nível mais alto, um
 * código sobrevive a perder cerca de 30% da sua área. O símbolo ocupa perto de
 * 5%, o que deixa margem larga para o papel dobrado, a luz fraca e a mão a
 * tremer, que é como estes códigos são realmente lidos.
 */
import QRCode from 'qrcode'

export interface OpcoesQr {
  /** Lado da imagem final, em pixels. */
  tamanho: number
  /** Cor dos módulos. */
  frente: string
  /** Cor do fundo. Transparente com `null`. */
  fundo: string | null
  /** Imagem a pôr ao centro. Já carregada. */
  simbolo?: CanvasImageSource | null
  /** Quanto do lado o símbolo ocupa, de 0 a 1. */
  simboloEscala?: number
  /** Módulos de margem à volta. A norma pede 4. */
  margem?: number
}

/**
 * Desenha o código num canvas que já exista.
 *
 * Devolve o número de módulos, que serve para quem quiser saber quanto detalhe
 * ficou lá dentro (um endereço mais comprido dá um código mais denso, e mais
 * denso lê-se pior de longe).
 */
export function desenharQr(canvas: HTMLCanvasElement, texto: string, o: OpcoesQr): number {
  const {
    tamanho, frente, fundo, simbolo = null, simboloEscala = 0.22, margem = 4,
  } = o

  /*
    Correcção de erros no nível mais alto, sempre. É o que paga o símbolo ao
    centro. Sem ele, um código com o símbolo por cima passa a depender da
    sorte, e a avaria aparece no dia do casamento, não hoje.
  */
  const qr = QRCode.create(texto, { errorCorrectionLevel: 'H' })
  const n = qr.modules.size
  const dados = qr.modules.data

  const ctx = canvas.getContext('2d')!
  const dpr = typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 3)
  canvas.width = Math.round(tamanho * dpr)
  canvas.height = Math.round(tamanho * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, tamanho, tamanho)

  if (fundo) {
    ctx.fillStyle = fundo
    ctx.fillRect(0, 0, tamanho, tamanho)
  }

  const total = n + margem * 2
  const passo = tamanho / total
  const desvio = margem * passo

  const ligado = (linha: number, coluna: number) =>
    linha >= 0 && coluna >= 0 && linha < n && coluna < n && Boolean(dados[linha * n + coluna])

  // Os três olhos desenham-se à parte, por isso os seus módulos são saltados no
  // varrimento geral. Desenhá-los como pontos redondos soltos tornava-os
  // irreconhecíveis para o leitor, que procura exactamente este padrão.
  const dentroDeOlho = (linha: number, coluna: number) =>
    (linha < 7 && coluna < 7) || (linha < 7 && coluna >= n - 7) || (linha >= n - 7 && coluna < 7)

  ctx.fillStyle = frente

  for (let linha = 0; linha < n; linha++) {
    for (let coluna = 0; coluna < n; coluna++) {
      if (!ligado(linha, coluna) || dentroDeOlho(linha, coluna)) continue

      const x = desvio + coluna * passo
      const y = desvio + linha * passo

      /*
        Um módulo isolado fica redondo; um que tenha vizinhos funde-se com
        eles. É o que dá o aspecto de traço contínuo em vez de um tapete de
        confetti, e mantém a área preenchida igual à do código original — que é
        o que o leitor mede.
      */
      const vizinhos =
        (ligado(linha - 1, coluna) ? 1 : 0) + (ligado(linha + 1, coluna) ? 1 : 0) +
        (ligado(linha, coluna - 1) ? 1 : 0) + (ligado(linha, coluna + 1) ? 1 : 0)
      const raio = vizinhos === 0 ? passo / 2 : passo * 0.28

      caixaRedonda(ctx, x, y, passo, passo, raio)
      ctx.fill()
    }
  }

  for (const [linha, coluna] of [[0, 0], [0, n - 7], [n - 7, 0]] as const) {
    desenharOlho(ctx, desvio + coluna * passo, desvio + linha * passo, passo, frente, fundo)
  }

  if (simbolo) {
    const lado = tamanho * simboloEscala
    const x = (tamanho - lado) / 2
    const respiro = lado * 0.16

    /*
      A almofada por baixo do símbolo não é decoração: sem ela o símbolo
      assenta em cima de módulos escuros e o leitor vê um borrão em vez de uma
      zona danificada limpa. Com ela, a correcção de erros trata daquilo como
      um pedaço em falta, que é o que sabe reparar.
    */
    ctx.fillStyle = fundo ?? '#ffffff'
    caixaRedonda(ctx, x - respiro, x - respiro, lado + respiro * 2, lado + respiro * 2, lado * 0.22)
    ctx.fill()

    /*
      O símbolo entra na caixa com a proporção que tem, e não esticado até ela.
      O da NEBULA é mais alto do que largo, e desenhado num quadrado ficava um
      N gordo — coisa que ninguém consegue apontar mas toda a gente vê.
    */
    const largura = medida(simbolo, 'width')
    const altura = medida(simbolo, 'height')
    const escala = largura && altura ? Math.min(lado / largura, lado / altura) : 1
    const w = largura ? largura * escala : lado
    const h = altura ? altura * escala : lado
    ctx.drawImage(simbolo, (tamanho - w) / 2, (tamanho - h) / 2, w, h)
  }

  return n
}

/**
 * As dimensões de uma imagem, seja ela `<img>`, canvas ou bitmap.
 *
 * Os três tipos que o canvas aceita guardam o tamanho em sítios diferentes, e
 * nenhum deles o expõe pela mesma propriedade.
 */
function medida(fonte: CanvasImageSource, qual: 'width' | 'height'): number {
  const v = (fonte as unknown as Record<string, unknown>)[
    qual === 'width'
      ? ('naturalWidth' in fonte ? 'naturalWidth' : 'width')
      : ('naturalHeight' in fonte ? 'naturalHeight' : 'height')
  ]
  return typeof v === 'number' ? v : 0
}

function caixaRedonda(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, largura: number, altura: number, raio: number,
) {
  const r = Math.min(raio, largura / 2, altura / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + largura, y, x + largura, y + altura, r)
  ctx.arcTo(x + largura, y + altura, x, y + altura, r)
  ctx.arcTo(x, y + altura, x, y, r)
  ctx.arcTo(x, y, x + largura, y, r)
  ctx.closePath()
}

/**
 * Um dos três quadrados dos cantos.
 *
 * Sete módulos de lado: anel de um módulo, espaço de um, e um miolo de três. As
 * proporções são da norma e não se mexem; o que se muda aqui são só os cantos.
 */
function desenharOlho(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, passo: number,
  frente: string, fundo: string | null,
) {
  const lado = passo * 7

  ctx.fillStyle = frente
  caixaRedonda(ctx, x, y, lado, lado, passo * 2)
  ctx.fill()

  // O buraco é pintado com a cor do fundo em vez de recortado: um recorte
  // deixaria ver o que estivesse por trás do canvas, e o código impresso passa
  // a ter um anel transparente no meio de uma folha branca.
  ctx.fillStyle = fundo ?? '#ffffff'
  caixaRedonda(ctx, x + passo, y + passo, passo * 5, passo * 5, passo * 1.4)
  ctx.fill()

  ctx.fillStyle = frente
  caixaRedonda(ctx, x + passo * 2, y + passo * 2, passo * 3, passo * 3, passo * 0.9)
  ctx.fill()
}
