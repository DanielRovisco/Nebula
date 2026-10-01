import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { api } from '../../lib/gallery/api'
import type { Photo } from '../../lib/gallery/types'

/**
 * Pôr um vídeo a correr aqui no painel, com os números à frente.
 *
 * Isto existe porque "trava no telemóvel" não se resolve a adivinhar. Já se
 * tentou baixar a resolução, baixar o débito e trocar o formato, e a cada
 * tentativa a única forma de saber se tinha servido era voltar a abrir a galeria
 * e olhar. Olhar não distingue as três coisas que fazem um vídeo travar, e cada
 * uma delas resolve-se de maneira diferente:
 *
 *   - falta de rede: o leitor fica à espera, e o travão é uma paragem.
 *   - falta de músculo para descodificar: o leitor não para, mas deixa cair
 *     imagens pelo caminho. É o que acontece a um telemóvel com um formato que
 *     ele não descodifica no chip.
 *   - o ficheiro já vir aos saltos: nem pára nem deixa cair nada, e mexe mal.
 *
 * Os três números que estão aqui em baixo separam-nas. E abre-se no telemóvel,
 * que é onde o problema existe: no computador corre tudo.
 */

/** O que o leitor foi dizendo enquanto o vídeo corria. */
interface Medida {
  paragens: number
  perdidos: number
  totais: number
  largura: number
  altura: number
  fps: number
  /** Segundos já em memória à frente de onde vai a reprodução. */
  folga: number
  /**
   * Quanto do tempo a correr é que o vídeo andou mesmo para a frente, em
   * percentagem.
   *
   * É este o número que corresponde à palavra "trava". Cem por cento é um vídeo
   * que avança um segundo por cada segundo de relógio; vinte por cento é um
   * vídeo que, em dez segundos de espera, mostrou dois. Conta-se só com a
   * reprodução a andar, para quem puser em pausa não ficar com uma leitura má.
   */
  fluidez: number
  /** Segundos desde que este ficheiro foi aberto, a correr ou à espera. */
  aberto: number
  /** Se o leitor está parado neste momento. */
  pausado: boolean
}

const VAZIO: Medida = {
  paragens: 0, perdidos: 0, totais: 0, largura: 0, altura: 0, fps: 0, folga: 0, fluidez: 100, aberto: 0, pausado: true,
}

const mb = (bytes: number) => `${Math.round(bytes / 1024 ** 2)} MB`

/**
 * A leitura dos três números, em português.
 *
 * Uma frase e não um valor cru: o número de imagens perdidas só quer dizer algo
 * ao lado do número de paragens e da folga que havia em memória.
 */
function veredicto(m: Medida): { texto: string; mau: boolean } {
  /*
    Umas dezenas de imagens antes de dizer o que for: com cinco imagens contadas,
    uma perdida já dá vinte por cento e a frase acusava o aparelho de uma coisa
    que não se tinha passado.
  */
  /*
    Um leitor em pausa não é um diagnóstico. Chega-se aqui mais vezes do que
    parece: um browser que recusa começar sozinho com som deixa o vídeo parado
    com o ficheiro já em memória, e sem esta linha a leitura acusava a rede de uma
    coisa que a rede não fez.
  */
  if (m.pausado && m.totais < 30) {
    return { texto: 'Carrega em play para começar a medir.', mau: false }
  }
  if (m.totais < 30) {
    /*
      Um vídeo que nem arranca é o pior caso de todos e, sem esta linha, era o
      que menos se percebia: ficava a dizer "deixa correr uns segundos" para
      sempre, como se faltasse paciência e não rede.
    */
    if (m.aberto > 8) {
      return {
        texto: 'Passaram mais de oito segundos e o vídeo ainda não arrancou:'
          + ' nesta rede este ficheiro não dá. É o caso mais claro de precisar de uma cópia'
          + ' mais leve.',
        mau: true,
      }
    }
    return { texto: 'Deixa correr uns segundos para haver o que medir.', mau: false }
  }

  const fraccao = m.totais ? m.perdidos / m.totais : 0
  if (m.fluidez >= 90 && fraccao <= 0.02) {
    return {
      texto: `Andou ${m.fluidez}% do tempo a correr, sem imagens perdidas:`
        + ' neste aparelho e nesta rede, este ficheiro corre bem.',
      mau: false,
    }
  }

  if (m.folga < 2) {
    return {
      texto: `Só andou ${m.fluidez}% do tempo, e ficou sem memória à frente:`
        + ' o travão é a rede. Uma cópia mais leve ainda resolve isto.',
      mau: true,
    }
  }
  if (fraccao > 0.02) {
    return {
      texto: `Caíram ${Math.round(fraccao * 100)}% das imagens com memória de sobra:`
        + ' a rede chega e o aparelho é que não está a descodificar este formato no chip.'
        + ' É o formato que tem de mudar, não o tamanho.',
      mau: true,
    }
  }
  return {
    texto: `Andou ${m.fluidez}% do tempo com memória de sobra e sem perder imagens:`
      + ' o ficheiro já vem aos saltos de origem. Vale a pena prepará-lo outra vez.',
    mau: true,
  }
}

export default function ProvaDeVideo({ photo, aoFechar }: { photo: Photo; aoFechar: () => void }) {
  const [qual, setQual] = useState<'leve' | 'original'>(photo.previewPath ? 'leve' : 'original')
  const [enderecos, setEnderecos] = useState<{ leve: string | null; original: string } | null>(null)
  const [erro, setErro] = useState(false)
  const [medida, setMedida] = useState<Medida>(VAZIO)
  const video = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    let vivo = true
    const caminhos = photo.previewPath
      ? [photo.previewPath, photo.storagePath]
      : [photo.storagePath]
    api
      .readUrls(caminhos)
      .then((urls) => {
        if (!vivo) return
        setEnderecos(photo.previewPath
          ? { leve: urls[0], original: urls[1] }
          : { leve: null, original: urls[0] })
      })
      .catch(() => { if (vivo) setErro(true) })
    return () => { vivo = false }
  }, [photo.previewPath, photo.storagePath])

  useEffect(() => {
    const v = video.current
    if (!v) return

    const parou = () => setMedida((m) => ({ ...m, paragens: m.paragens + 1 }))
    v.addEventListener('waiting', parou)

    /*
      Meio segundo entre leituras, e o ritmo das imagens tirado da diferença
      entre duas: `getVideoPlaybackQuality` dá os totais desde o início, não o
      ritmo. Em Safari antigos não existe e usam-se os nomes antigos com prefixo;
      sem nenhum deles, fica a zero e a frase final diz o que puder dizer.
    */
    let antes = 0
    let quando = performance.now()
    let tempoDoVideo = v.currentTime
    let andou = 0
    let esperou = 0
    const relogio = setInterval(() => {
      type ComQualidade = HTMLVideoElement & {
        getVideoPlaybackQuality?: () => { totalVideoFrames: number; droppedVideoFrames: number }
        webkitDecodedFrameCount?: number
        webkitDroppedFrameCount?: number
      }
      const vq = v as ComQualidade
      const q = vq.getVideoPlaybackQuality?.()
      const totais = q?.totalVideoFrames ?? vq.webkitDecodedFrameCount ?? 0
      const perdidos = q?.droppedVideoFrames ?? vq.webkitDroppedFrameCount ?? 0

      const agora = performance.now()
      const fps = v.paused ? 0 : Math.round(((totais - antes) * 1000) / (agora - quando))
      /*
        Quanto é que o vídeo andou contra quanto tempo passou. Em pausa não se
        conta nada: parar o vídeo de propósito não é o vídeo a travar. Um salto
        para trás na barra também não conta, senão a conta ficava negativa.
      */
      const avanco = v.currentTime - tempoDoVideo
      if (!v.paused && avanco >= 0) {
        andou += avanco
        esperou += (agora - quando) / 1000
      }
      tempoDoVideo = v.currentTime
      antes = totais
      quando = agora

      const folga = v.buffered.length
        ? Math.max(0, v.buffered.end(v.buffered.length - 1) - v.currentTime)
        : 0

      setMedida((m) => ({
        ...m,
        totais,
        perdidos,
        largura: v.videoWidth,
        altura: v.videoHeight,
        fps: fps > 0 ? fps : m.fps,
        folga: Math.round(folga),
        fluidez: esperou > 0 ? Math.min(100, Math.round((andou / esperou) * 100)) : 100,
        aberto: m.aberto + 0.5,
        pausado: v.paused,
      }))
    }, 500)

    return () => {
      v.removeEventListener('waiting', parou)
      clearInterval(relogio)
    }
  }, [qual, enderecos])

  const endereco = qual === 'leve' ? enderecos?.leve : enderecos?.original
  const bytes = qual === 'leve' ? photo.previewBytes : photo.sizeBytes
  const leitura = veredicto(medida)

  return createPortal(
    <div className="fixed inset-0 z-[120] bg-eerie flex flex-col">
      <header className="flex items-center gap-3 px-4 h-14 shrink-0 relative z-10">
        <button onClick={aoFechar} aria-label="Fechar" className="p-2 text-titanium/60 hover:text-titanium">
          <X size={20} />
        </button>
        <p className="flex-1 min-w-0 truncate text-sm text-titanium/70">{photo.fileName}</p>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6">
        <div className="max-w-xl mx-auto">
          {photo.previewPath && (
            <div className="flex gap-2 mb-3">
              {(['leve', 'original'] as const).map((k) => (
                <button
                  key={k}
                  /*
                    A contagem recomeça aqui, e não num efeito a olhar para a
                    escolha: os números do original somados aos da cópia leve não
                    diziam nada, e um efeito que mexe no estado logo a seguir ao
                    desenho faz a página desenhar-se duas vezes por nada.
                  */
                  onClick={() => { setQual(k); setMedida(VAZIO) }}
                  className={`flex-1 py-2 rounded-lg text-[13px] border transition-colors ${
                    qual === k
                      ? 'border-titanium/60 text-titanium'
                      : 'border-titanium/15 text-titanium/50 hover:border-titanium/35'
                  }`}
                >
                  {k === 'leve' ? 'Cópia leve' : 'Original'}
                  {(k === 'leve' ? photo.previewBytes : photo.sizeBytes)
                    ? ` · ${mb((k === 'leve' ? photo.previewBytes : photo.sizeBytes)!)}`
                    : ''}
                </button>
              ))}
            </div>
          )}

          {erro && (
            <p className="text-[13px] text-amber-300/80">
              Não foi possível assinar o endereço do ficheiro. Volta a entrar no painel.
            </p>
          )}

          {endereco && (
            <video
              /*
                A chave leva o ficheiro escolhido: sem ela, trocar de leve para
                original mudava o `src` sem o leitor recomeçar, e os números
                continuavam a ser os do ficheiro anterior.
              */
              key={endereco}
              ref={video}
              src={endereco}
              controls
              autoPlay
              playsInline
              className="w-full rounded-lg bg-black"
            />
          )}

          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
            {[
              ['Ficheiro', qual === 'leve' ? 'cópia leve' : 'original'],
              ['Tamanho', bytes ? mb(bytes) : 'por saber'],
              ['Imagem', medida.largura ? `${medida.largura}x${medida.altura}` : '...'],
              ['Imagens por segundo', medida.fps ? String(medida.fps) : '...'],
              ['Paragens', String(medida.paragens)],
              ['Imagens perdidas', `${medida.perdidos} de ${medida.totais}`],
              ['Memória à frente', `${medida.folga} s`],
              ['Andou do tempo', `${medida.fluidez}%`],
            ].map(([rotulo, valor]) => (
              <div key={rotulo} className="flex justify-between gap-2 border-b border-titanium/10 pb-1">
                <dt className="text-titanium/45">{rotulo}</dt>
                <dd className="text-titanium/80 text-right">{valor}</dd>
              </div>
            ))}
          </dl>

          <p className={`mt-4 text-[13px] leading-relaxed ${leitura.mau ? 'text-amber-300/85' : 'text-titanium/55'}`}>
            {leitura.texto}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  )
}
