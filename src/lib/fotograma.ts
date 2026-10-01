/**
 * Tirar um fotograma a um vídeo, dentro do browser.
 *
 * Serve os sítios todos que precisam disto: o envio dos convidados, que faz a
 * miniatura no telemóvel de quem manda o vídeo; os painéis, que a fazem depois
 * do facto aos vídeos que subiram antes de isto existir; e o carregamento das
 * galerias de cliente.
 *
 * Vive num ficheiro próprio porque o que aqui está é quase todo cuidado com
 * browsers, e ter duas cópias desse cuidado é ter uma que fica para trás.
 */

export type Fotograma =
  | {
      ok: true
      imagem: Blob
      /** Medidas da imagem que saiu. */
      largura: number
      altura: number
      /** Medidas do vídeo, que não são as mesmas. */
      larguraOriginal: number
      alturaOriginal: number
      /** Duração, em segundos. É ela que diz o débito do ficheiro. */
      segundos: number | null
    }
  /** O browser não conseguiu abrir o vídeo. Formato que não lê, ou CORS. */
  | { ok: false; porque: 'sem_video' }
  /** Abriu, mas não deu fotograma nenhum a tempo. */
  | { ok: false; porque: 'sem_fotograma' }
  | { ok: false; porque: 'falhou' }

export async function fotogramaDeVideo(
  fonte: string,
  {
    lado,
    cruzado = false,
    tempoMax = 15000,
    tipo = 'image/jpeg',
    qualidade = 0.75,
  }: {
    /** O maior lado da imagem que sai. */
    lado: number
    /** Vídeo de outra origem: obriga o bucket a responder com CORS. */
    cruzado?: boolean
    tempoMax?: number
    /** O formato de saída. As galerias de cliente guardam WebP. */
    tipo?: 'image/jpeg' | 'image/webp'
    qualidade?: number
  },
): Promise<Fotograma> {
  const v = document.createElement('video')
  try {
    /*
      Tudo isto é para o iOS.

      Num Safari de telemóvel, um vídeo sem `muted` e sem `playsinline` não
      descodifica nada sem alguém lhe tocar, e `preload="metadata"` fica-se pelo
      cabeçalho — o `loadeddata` nunca chega e o fotograma também não. Os
      atributos vão postos das duas maneiras de propósito: o iOS lê o atributo
      do elemento, não a propriedade.
    */
    v.preload = 'auto'
    v.muted = true
    v.defaultMuted = true
    v.playsInline = true
    v.setAttribute('muted', '')
    v.setAttribute('playsinline', '')
    v.setAttribute('webkit-playsinline', '')
    if (cruzado) v.crossOrigin = 'anonymous'
    v.src = fonte

    const estado = await new Promise<'ok' | 'sem_video' | 'sem_fotograma'>((resolve) => {
      const limite = setTimeout(
        () => resolve(v.readyState >= 2 && v.videoWidth ? 'ok' : v.readyState === 0 ? 'sem_video' : 'sem_fotograma'),
        tempoMax,
      )
      const fim = (r: 'ok' | 'sem_video' | 'sem_fotograma') => { clearTimeout(limite); resolve(r) }

      const talvez = () => {
        if (v.readyState >= 2 && v.videoWidth) { v.pause(); fim('ok') }
      }
      v.onerror = () => fim('sem_video')
      v.onseeked = talvez
      v.ontimeupdate = talvez
      v.oncanplay = talvez
      v.onloadeddata = () => {
        /*
          Um bocadinho para dentro, e não o primeiro instante: o primeiro
          fotograma de um vídeo de telemóvel é muitas vezes o sensor ainda a
          acertar a exposição, e sai preto.
        */
        try {
          v.currentTime = Math.min(0.3, (v.duration || 1) / 4)
        } catch {
          talvez()
        }
      }
      v.onloadedmetadata = () => {
        // Empurrão para o iOS descodificar. Falha em silêncio onde não é
        // preciso, e nesses o `seeked` chega primeiro de qualquer maneira.
        v.play().then(() => v.pause()).catch(() => {})
      }
    })

    if (estado !== 'ok') return { ok: false, porque: estado }
    if (!v.videoWidth) return { ok: false, porque: 'sem_fotograma' }

    const escala = Math.min(1, lado / Math.max(v.videoWidth, v.videoHeight))
    const c = document.createElement('canvas')
    c.width = Math.round(v.videoWidth * escala)
    c.height = Math.round(v.videoHeight * escala)
    const ctx = c.getContext('2d')
    if (!ctx) return { ok: false, porque: 'falhou' }
    ctx.drawImage(v, 0, 0, c.width, c.height)

    /*
      Um canvas que recebeu imagem de outra origem sem CORS fica "manchado", e
      o `toBlob` atira em vez de devolver nada. Apanha-se aqui para o recado
      ser o certo, e não um erro genérico.
    */
    let imagem: Blob | null
    try {
      imagem = await new Promise<Blob | null>((r) => c.toBlob(r, tipo, qualidade))
    } catch {
      return { ok: false, porque: 'sem_video' }
    }
    return imagem
      ? {
          ok: true,
          imagem,
          largura: c.width,
          altura: c.height,
          larguraOriginal: v.videoWidth,
          alturaOriginal: v.videoHeight,
          segundos: Number.isFinite(v.duration) && v.duration > 0 ? v.duration : null,
        }
      : { ok: false, porque: 'falhou' }
  } catch {
    return { ok: false, porque: 'falhou' }
  } finally {
    v.removeAttribute('src')
    v.load()
  }
}
