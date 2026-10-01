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
 * nenhum deste lado: o site é um conjunto de ficheiros estáticos.
 *
 * Isto já foi feito de outra maneira, e vale a pena dizer qual, porque a de
 * agora nasceu de a primeira não chegar. Antes: pôr o vídeo a tocar, copiar
 * cada fotograma para um canvas e gravar o canvas com o `MediaRecorder`. Três
 * problemas, todos sérios.
 *
 *   1. O formato era o que o `MediaRecorder` quisesse dar, e na maior parte dos
 *      browsers dá WebM com VP9. Um iPhone abre esse ficheiro — e descodifica-o
 *      por software, porque não tem VP9 no hardware. O vídeo engasga-se mesmo
 *      estando leve, que foi exactamente a queixa que deu origem a isto.
 *   2. Era em tempo real. Três minutos de vídeo, três minutos de espera, e um
 *      ficheiro de meio gigabyte punha o portátil a trabalhar um quarto de hora.
 *   3. Gravar enquanto se toca deixa cair fotogramas quando o encoder não
 *      acompanha, e esses saltos ficam gravados no ficheiro. Parte da travagem
 *      não vinha da rede: vinha de dentro da cópia.
 *
 * Agora é o `WebCodecs` que faz o trabalho, através da mediabunny, que lê o
 * ficheiro, desmonta-o, descodifica à velocidade a que a máquina der (não à
 * velocidade a que o vídeo toca), reduz, volta a codificar em H.264 e monta um
 * MP4. H.264 porque é o único formato que todos os telemóveis descodificam no
 * hardware — é por isso que isto existe. O WebM com VP9 fica só para o caso de
 * um browser não saber fazer H.264, e nesse caso o painel avisa.
 */

/**
 * O lado mais curto da cópia leve.
 *
 * É o lado curto e não o comprido porque é isso que "720p" quer dizer: um vídeo
 * deitado de 3840x2160 fica 1280x720, e um de pé de 2160x3840 fica 720x1280.
 * Limitar o lado comprido dava 720x405 a um vídeo que já estava em 720p — menos
 * de metade da altura, e pior do que o original.
 *
 * Setecentos e vinte e não mil e oitenta: isto é para se ver num telemóvel, e um
 * telemóvel tem trezentos e noventa pontos de largura. A diferença não se vê e o
 * ficheiro fica para menos de metade. Quem quiser o vídeo como ele é descarrega
 * o original, que continua lá intacto.
 */
export const LADO_CURTO_LEVE = 720

/**
 * Dois megabits e meio por segundo.
 *
 * O painel avisa acima de oito, que é onde um telemóvel começa a encravar, e
 * este alvo fica muito abaixo disso de propósito. A 720p, dois megabits e meio
 * dão uma imagem limpa num ecrã de telemóvel e correm numa rede móvel sem ir ao
 * limite — e deixam folga para a rede ter um bocado mau sem a reprodução parar.
 */
export const DEBITO_LEVE = 2_500_000

/** Abaixo disto não vale a pena converter: o ficheiro já corre em qualquer lado. */
export const DEBITO_QUE_JA_CHEGA = 3_500_000

/**
 * Trinta imagens por segundo, no máximo.
 *
 * Um vídeo a 50 ou 60 dá o dobro do trabalho ao descodificador e, para o mesmo
 * débito, metade dos bits por imagem: num telemóvel isso é a diferença entre
 * correr e engasgar. Trinta num ecrã de telefone não se distingue de sessenta.
 *
 * Só se baixa, nunca se sobe: forçar trinta num vídeo de cinema a 24 obrigava a
 * repetir uma imagem a cada quatro, e isso vê-se no movimento.
 */
const FPS_MAXIMO = 30

/**
 * O perfil do H.264 que se pede ao codificador.
 *
 * Um ficheiro pode dizer H.264 e continuar a não ter descodificador em
 * hardware: os perfis altos (o High 10, por exemplo, que é por onde sai um vídeo
 * de dez bits) são descodificados por software nos telemóveis, e aí trava
 * exactamente como travava o VP9.
 *
 * `4D40` é o Main e `42E0` é o Baseline; `28` é o nível 4.0, que chega até
 * 1080p a trinta imagens. Qualquer iPhone ou Android dos últimos quinze anos
 * descodifica isto no chip. Experimenta-se pela ordem escrita e, se o browser
 * não aceitar nenhum, deixa-se a biblioteca escolher, que é melhor do que não
 * haver cópia leve.
 */
const PERFIS_H264 = ['avc1.4D4028', 'avc1.42E028']

/**
 * Uma imagem nova a cada dois segundos.
 *
 * Imagens completas são as únicas por onde se pode começar a ler, e portanto as
 * únicas para onde se pode saltar. De cinco em cinco segundos (o que vem por
 * omissão) arrastar a barra dá um salto notório; de dois em dois a barra responde
 * e o ficheiro cresce pouco.
 */
const INTERVALO_IMAGEM_COMPLETA = 2

export interface VersaoLeve {
  blob: Blob
  tipo: string
  largura: number
  altura: number
  segundos: number
  /** `true` quando saiu H.264 num MP4, que é o caso bom. */
  temHardware: boolean
}

/**
 * Se este browser consegue fazer a conversão de todo.
 *
 * Síncrona de propósito: quem chama decide com ela antes de ir buscar o vídeo, e
 * o `import` da mediabunny só acontece lá dentro, para não ir no pacote de quem
 * apenas vê uma galeria. Saber quais os formatos que a máquina codifica obriga a
 * perguntar ao browser e isso é assíncrono, por isso fica para a conversão: aqui
 * confirma-se só que as peças existem.
 *
 * O contexto seguro não é detalhe: fora de HTTPS o `VideoEncoder` nem é definido.
 */
export const sabeConverter = (): boolean =>
  typeof window !== 'undefined' &&
  window.isSecureContext &&
  typeof VideoEncoder !== 'undefined' &&
  typeof VideoDecoder !== 'undefined'

/**
 * Os formatos de saída, do melhor para o pior.
 *
 * A ordem é toda sobre o telemóvel de quem vai ver, e não sobre a qualidade:
 * H.264 tem descodificador em hardware em tudo o que se vende há quinze anos, e
 * é isso que faz um vídeo correr sem aquecer o aparelho nem engasgar. VP9 e VP8
 * são o que resta quando o browser de quem carrega não sabe fazer H.264.
 */
const ALVOS = [
  { codec: 'avc', contentor: 'mp4', tipo: 'video/mp4', som: 'aac', temHardware: true },
  { codec: 'vp9', contentor: 'webm', tipo: 'video/webm', som: 'opus', temHardware: false },
  { codec: 'vp8', contentor: 'webm', tipo: 'video/webm', som: 'opus', temHardware: false },
] as const

/**
 * Converte, e vai dizendo em que parte vai (de 0 a 1).
 *
 * Devolve nulo quando não dá: um browser sem as peças, um vídeo que ele não
 * saiba abrir, um formato que não saiba escrever. Nunca atira — quem chama está
 * a meio de um upload e o original já subiu.
 */
export async function versaoLeveDeVideo(
  ficheiro: Blob,
  aoAvancar?: (fraccao: number) => void,
): Promise<VersaoLeve | null> {
  if (!sabeConverter()) return null

  try {
    const mb = await import('mediabunny')

    /*
      Escolhe-se o vídeo e o som ao mesmo tempo, e não um depois do outro.

      Cada contentor tem um som que todos os aparelhos lêem: num MP4 é o AAC,
      num WebM é o Opus. Opus dentro de um MP4 é um ficheiro válido que um iPhone
      abre sem som nenhum, o que é pior do que não haver cópia leve, porque passa
      despercebido a quem carrega e não a quem vê. Por isso, se este browser sabe
      fazer H.264 mas não sabe fazer AAC, desce-se para o WebM inteiro em vez de
      se montar um MP4 meio coxo.
    */
    let alvo: (typeof ALVOS)[number] | null = null
    for (const a of ALVOS) {
      if (!(await mb.canEncodeVideo(a.codec))) continue
      if (!(await mb.canEncodeAudio(a.som))) continue
      alvo = a
      break
    }
    if (!alvo) return null
    const codecSom = alvo.som

    /*
      Qual dos perfis é que este browser aceita de facto. Pergunta-se antes de
      converter porque uma configuração recusada a meio deixava o vídeo sem cópia
      nenhuma, e porque a resposta é diferente de máquina para máquina.
    */
    let perfil: string | undefined
    if (alvo.codec === 'avc') {
      for (const candidato of PERFIS_H264) {
        try {
          const r = await VideoEncoder.isConfigSupported({
            codec: candidato,
            width: LADO_CURTO_LEVE,
            height: LADO_CURTO_LEVE,
            bitrate: DEBITO_LEVE,
            framerate: FPS_MAXIMO,
          })
          if (r.supported) { perfil = candidato; break }
        } catch { /* um candidato inválido não é motivo para desistir do resto */ }
      }
    }

    const input = new mb.Input({
      source: new mb.BlobSource(ficheiro),
      formats: mb.ALL_FORMATS,
    })
    const faixa = await input.getPrimaryVideoTrack()
    if (!faixa) return null

    /*
      As dimensões que contam são as de apresentação, não as que estão
      guardadas. Um telemóvel grava de pé escrevendo 1920x1080 no ficheiro mais
      uma nota a dizer "roda isto": `displayWidth` já traz a rotação aplicada, e
      é por isso que um vídeo vertical não sai daqui deitado.
    */
    const largura = faixa.displayWidth
    const altura = faixa.displayHeight
    if (!largura || !altura) return null
    const deitado = largura >= altura
    const curto = Math.min(largura, altura)

    /*
      Pede-se um lado só e deixa-se a outra medida ser deduzida, para a proporção
      ficar exacta. E não se amplia nada: um vídeo que já esteja abaixo de 720
      mantém o tamanho e só perde débito.
    */
    /*
      As imagens por segundo da entrada, para só se baixar quando há o que
      baixar. Mede-se por amostragem dos primeiros pacotes, o que num ficheiro
      de meio gigabyte custa a leitura de um bocadinho do início.
    */
    let fps: number | null = null
    try {
      fps = (await faixa.computePacketStats(120)).averagePacketRate || null
    } catch { /* sem este número mantém-se o ritmo original */ }

    const reduzir = curto > LADO_CURTO_LEVE
    const medida = !reduzir ? {} : deitado
      ? { height: LADO_CURTO_LEVE }
      : { width: LADO_CURTO_LEVE }

    const output = new mb.Output({
      format: alvo.contentor === 'mp4'
        /*
          `fastStart` põe o índice do ficheiro no início em vez do fim. Sem isto
          o leitor tem de ir buscar o fim do ficheiro antes de poder começar, o
          que num telemóvel são mais uns segundos de ecrã preto à espera.
        */
        ? new mb.Mp4OutputFormat({ fastStart: 'in-memory' })
        : new mb.WebMOutputFormat(),
      target: new mb.BufferTarget(),
    })

    const conversao = await mb.Conversion.init({
      input,
      output,
      video: {
        ...medida,
        codec: alvo.codec,
        ...(perfil ? { fullCodecString: perfil } : {}),
        ...(fps && fps > FPS_MAXIMO + 1 ? { frameRate: FPS_MAXIMO } : {}),
        quality: new mb.Quality({ bitrate: DEBITO_LEVE, bitrateMode: 'variable' }),
        keyFrameInterval: INTERVALO_IMAGEM_COMPLETA,
        /*
          Sem isto a mediabunny pode copiar o vídeo tal e qual quando o formato
          já serve, o que é esperto na generalidade e aqui é o contrário do que
          se quer: o ponto é precisamente deixá-lo mais leve.
        */
        forceTranscode: true,
      },
      audio: { codec: codecSom, bitrate: 128_000 },
    })
    if (!conversao.isValid) return null
    if (aoAvancar) conversao.onProgress = (fraccao) => aoAvancar(fraccao)

    await conversao.execute()
    aoAvancar?.(1)

    const buffer = output.target.buffer
    if (!buffer || !buffer.byteLength) return null
    const blob = new Blob([buffer], { type: alvo.tipo })

    // Uma cópia que não ficou mais leve não serve de nada: deita-se fora e
    // guarda-se só o original.
    if (blob.size >= ficheiro.size) return null

    const escala = reduzir ? LADO_CURTO_LEVE / curto : 1
    return {
      blob,
      tipo: alvo.tipo,
      largura: Math.round(largura * escala),
      altura: Math.round(altura * escala),
      segundos: await input.computeDuration(),
      temHardware: alvo.temHardware,
    }
  } catch {
    return null
  }
}
