/**
 * Fazer uma segunda cópia de um vídeo, leve o suficiente para correr num
 * telemóvel, sem deixar de guardar o original.
 *
 * O original de uma câmara anda nos quinze ou vinte megabits por segundo. Um
 * computador ligado por cabo aguenta isso; um telemóvel numa casa ou na rua não
 * — medido, um ficheiro de 17 Mbps corre a 25 Mbps de rede e nem arranca a dez.
 * Quem vê a galeria vê quase sempre no telemóvel.
 *
 * Converter acontece aqui, no browser de quem carrega, porque não há servidor
 * nenhum deste lado: o site é um conjunto de ficheiros estáticos. É lento — o
 * vídeo é lido ao ritmo a que toca, por isso três minutos de vídeo são três
 * minutos de espera — e é por isso que quem chama isto mostra o andamento e
 * deixa seguir sem ele quando falha.
 *
 * O formato que sai depende do browser: o Chrome dá WebM e os Safari recentes
 * dão MP4. Como nem todos os telemóveis lêem WebM, a galeria oferece as duas
 * fontes ao `<video>` e deixa o browser do cliente escolher — a leve primeiro,
 * o original a seguir. Assim esta cópia só acrescenta, nunca tira.
 */

/**
 * O lado mais curto da cópia leve.
 *
 * É o lado curto e não o comprido porque é isso que "1080p" quer dizer: um
 * vídeo deitado de 3840x2160 fica 1920x1080, e um de pé de 2160x3840 fica
 * 1080x1920. Limitar o lado comprido dava 1080x608 a um vídeo que já estava em
 * 1080p — menos de metade da altura, e pior do que o original.
 */
export const LADO_CURTO_LEVE = 1080

/**
 * Cinco megabits por segundo.
 *
 * O painel avisa acima de oito, que é onde um telemóvel começa a encravar. O
 * alvo fica abaixo disso de propósito, com folga: a 1080p, cinco megabits dão
 * uma imagem que ninguém distingue da original num ecrã de telemóvel, e correm
 * numa ligação de casa ou numa rede móvel sem ir ao limite.
 */
export const DEBITO_LEVE = 5_000_000

/** Abaixo disto não vale a pena converter: o ficheiro já corre em qualquer lado. */
export const DEBITO_QUE_JA_CHEGA = 6_000_000

export interface VersaoLeve {
  blob: Blob
  tipo: string
  largura: number
  altura: number
  segundos: number
}

/** Os formatos que este browser sabe gravar, do melhor para o pior. */
function formatoPreferido(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  /*
    Só pedidos com o codec escrito por extenso.

    Pedir `video/mp4` sem mais nada parece inofensivo e não é: este browser
    respondeu que sabia e devolveu VP9 dentro de um MP4 — um ficheiro que diz
    `video/mp4` e que nenhum iPhone abre. Passava despercebido, porque o
    contentor estava certo e o conteúdo não.

    Com o codec escrito, ou o browser dá mesmo H.264 ou diz que não sabe, e
    nesse caso faz-se um WebM honesto, que pelo menos se identifica pelo que é.
  */
  const tentativas = [
    'video/mp4;codecs=avc1.4d002a,mp4a.40.2',
    'video/mp4;codecs=avc1.42e01e,mp4a.40.2',
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
  ]
  return tentativas.find((t) => MediaRecorder.isTypeSupported(t)) ?? null
}

/** Se este browser consegue fazer a conversão de todo. */
export const sabeConverter = (): boolean =>
  typeof MediaRecorder !== 'undefined' &&
  typeof HTMLVideoElement !== 'undefined' &&
  'captureStream' in HTMLVideoElement.prototype &&
  formatoPreferido() !== null

/**
 * Converte, e vai dizendo em que parte vai (de 0 a 1).
 *
 * Devolve nulo quando não dá: um browser sem as peças, um formato que ele não
 * abre, ou um vídeo que não chega ao fim. Nunca atira — quem chama está a meio
 * de um upload e o original já subiu.
 */
export async function versaoLeveDeVideo(
  ficheiro: Blob,
  aoAvancar?: (fraccao: number) => void,
): Promise<VersaoLeve | null> {
  const tipo = formatoPreferido()
  if (!tipo || !sabeConverter()) return null

  const endereco = URL.createObjectURL(ficheiro)
  const v = document.createElement('video')
  let parar: (() => void) | null = null

  try {
    v.src = endereco
    v.muted = true
    v.playsInline = true
    v.preload = 'auto'

    const abriu = await new Promise<boolean>((resolve) => {
      const limite = setTimeout(() => resolve(false), 30000)
      v.onerror = () => { clearTimeout(limite); resolve(false) }
      v.onloadedmetadata = () => { clearTimeout(limite); resolve(true) }
    })
    if (!abriu || !v.videoWidth || !Number.isFinite(v.duration)) return null

    const escala = Math.min(1, LADO_CURTO_LEVE / Math.min(v.videoWidth, v.videoHeight))
    const largura = Math.round(v.videoWidth * escala / 2) * 2
    const altura = Math.round(v.videoHeight * escala / 2) * 2

    /*
      A imagem passa por um canvas porque é a única maneira de a encolher: o
      fluxo que sai do `<video>` vem no tamanho do original, e gravar 4K a oito
      megabits dá uma imagem pior do que 1080p aos mesmos oito.

      O som não passa pelo canvas — vem do fluxo do vídeo e junta-se ao lado.
      Sem isto a cópia leve ficava muda, que é pior do que não existir.
    */
    const canvas = document.createElement('canvas')
    canvas.width = largura
    canvas.height = altura
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return null

    const fluxoCanvas = canvas.captureStream(30)
    const fluxoVideo = (v as HTMLVideoElement & { captureStream(): MediaStream }).captureStream()
    for (const faixa of fluxoVideo.getAudioTracks()) fluxoCanvas.addTrack(faixa)

    const gravador = new MediaRecorder(fluxoCanvas, {
      mimeType: tipo,
      videoBitsPerSecond: DEBITO_LEVE,
      audioBitsPerSecond: 128_000,
    })
    const pedacos: BlobPart[] = []
    gravador.ondataavailable = (e) => { if (e.data.size) pedacos.push(e.data) }

    const terminou = new Promise<void>((resolve) => { gravador.onstop = () => resolve() })

    /*
      Desenhar a cada fotograma que o vídeo entrega, e não a cada fotograma do
      ecrã. Com `requestAnimationFrame` um vídeo a 24 imagens por segundo num
      ecrã a 60 era desenhado duas vezes e meia por imagem, e o gravador ficava
      com trabalho a dobrar para o mesmo resultado.
    */
    const temCallback = 'requestVideoFrameCallback' in v
    let aCorrer = true
    const desenhar = () => {
      if (!aCorrer) return
      ctx.drawImage(v, 0, 0, largura, altura)
      aoAvancar?.(v.duration ? Math.min(1, v.currentTime / v.duration) : 0)
      if (temCallback) {
        (v as HTMLVideoElement & {
          requestVideoFrameCallback(cb: () => void): number
        }).requestVideoFrameCallback(desenhar)
      } else {
        requestAnimationFrame(desenhar)
      }
    }

    parar = () => { aCorrer = false; try { gravador.stop() } catch { /* já parado */ } }
    v.onended = () => parar?.()

    gravador.start(1000)
    desenhar()
    await v.play()

    /*
      Um tecto de tempo com folga: o dobro da duração mais um minuto. Serve para
      um vídeo que encrave a meio não deixar a página à espera para sempre.
    */
    const tecto = setTimeout(() => parar?.(), (v.duration * 2 + 60) * 1000)
    await terminou
    clearTimeout(tecto)
    aoAvancar?.(1)

    if (!pedacos.length) return null
    /*
      O tipo que se guarda é o que o gravador diz ter feito, e não o que lhe foi
      pedido. É ele que vai no `<source type=...>` da galeria, e um tipo errado
      ali faz o browser do cliente descartar a cópia leve sem a experimentar.
    */
    const tipoReal = gravador.mimeType || tipo
    const blob = new Blob(pedacos, { type: tipoReal })

    /*
      Nota sobre o WebM, para quem vier a seguir.

      Um WebM gravado assim não traz a duração escrita no cabeçalho: o gravador
      não sabe quando vai parar e deixa o campo por preencher. O vídeo abre e
      salta para onde se quiser — medido — mas `duration` fica em `Infinity` até
      o ficheiro acabar de chegar, e nesse intervalo a barra de progresso não
      mostra o fim.

      Tentou-se corrigir com a biblioteca que serve para isso (webm-duration-fix)
      e nestes ficheiros não corrigia nada: corria sem erro e a duração continuava
      infinita. Ficou de fora em vez de ficar a dar a ideia de que estava tratado.

      Por isso é que a lista de formatos tem MP4 à frente: um MP4 fecha-se com os
      números todos lá dentro e não tem este problema. O WebM é o que resta para
      browsers que não saibam fazer MP4, e vale mais do que não haver cópia leve
      nenhuma.
    */
    // Uma cópia que não ficou mais leve não serve de nada: deita-se fora e
    // guarda-se só o original.
    if (blob.size >= ficheiro.size) return null

    return { blob, tipo: tipoReal, largura, altura, segundos: v.duration }
  } catch {
    return null
  } finally {
    parar?.()
    v.removeAttribute('src')
    v.load()
    URL.revokeObjectURL(endereco)
  }
}
