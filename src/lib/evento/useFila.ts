import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ErroEvento, enviarFicheiro, pedirUpload, registarUpload,
} from './api'
import {
  type ItemFila, apagar, guardar, juntar, limparEnviados, listar,
} from './fila'

/** Quantas vezes se insiste antes de desistir e mostrar o botão de repetir. */
const TENTATIVAS_MAX = 5

/** Espera entre tentativas, a dobrar, com tecto. */
const espera = (n: number) => Math.min(30000, 1000 * 2 ** n)

const MINIATURA = 480
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Miniatura para a grelha, feita no browser.
 *
 * Só para fotografias. Um vídeo obrigava a desenhar um fotograma num canvas, o
 * que em iOS depende de o ficheiro ser lido inteiro para memória — 500 MB no
 * telemóvel de um convidado, para ganhar uma imagem de pré-visualização. Não
 * compensa: os vídeos mostram-se com o seu próprio primeiro fotograma.
 */
async function miniatura(f: Blob): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(f)
    const escala = Math.min(1, MINIATURA / Math.max(bitmap.width, bitmap.height))
    const c = document.createElement('canvas')
    c.width = Math.round(bitmap.width * escala)
    c.height = Math.round(bitmap.height * escala)
    c.getContext('2d')!.drawImage(bitmap, 0, 0, c.width, c.height)
    bitmap.close()
    return await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.75))
  } catch {
    // Formato que o browser não abre (HEIC em alguns Android, RAW). O ficheiro
    // sobe na mesma, com a qualidade que tinha; fica é sem miniatura.
    return null
  }
}

export interface EstadoFila {
  itens: ItemFila[]
  aEnviar: boolean
  online: boolean
  porEnviar: number
  enviados: number
  comErro: number
}

/**
 * Toma conta da fila: guarda o que se escolhe, envia o que falta, e volta a
 * tentar sozinha quando a rede regressa.
 *
 * Envia um ficheiro de cada vez. Com boa rede, vários em paralelo seriam mais
 * rápidos; num casamento não há boa rede, e em paralelo o que acontece é que
 * todos avançam devagar e todos expiram ao mesmo tempo. Um de cada vez faz com
 * que cada minuto de rede que apareça sirva para terminar alguma coisa.
 */
export function useFila(slug: string) {
  const [itens, setItens] = useState<ItemFila[]>([])
  const [aEnviar, setAEnviar] = useState(false)
  const [online, setOnline] = useState(() => navigator.onLine)

  // A referência existe porque o motor corre fora do React e precisa de ler o
  // estado mais recente sem se reiniciar a cada mudança de progresso.
  const itensRef = useRef<ItemFila[]>([])
  const aCorrer = useRef(false)
  const montado = useRef(true)

  const publicar = useCallback((lista: ItemFila[]) => {
    itensRef.current = lista
    if (montado.current) setItens(lista)
  }, [])

  const actualizar = useCallback(
    async (id: string, mudanca: Partial<ItemFila>, persistir = true) => {
      const lista = itensRef.current.map((i) => (i.id === id ? { ...i, ...mudanca } : i))
      publicar(lista)
      if (persistir) {
        const item = lista.find((i) => i.id === id)
        if (item) await guardar(item)
      }
    },
    [publicar],
  )

  /** Sobe um ficheiro: pede o endereço, envia, e regista. */
  const enviarUm = useCallback(
    async (item: ItemFila) => {
      if (!item.blob) return
      await actualizar(item.id, { estado: 'a-enviar', progresso: 0, erro: undefined })

      const { key, url } = await pedirUpload(slug, item.nome, item.tipo, item.tamanho)
      await enviarFicheiro(url, item.blob, item.tipo, (f) => {
        // O progresso não vai ao disco: escrever no IndexedDB a cada pedaço
        // enviado dava centenas de escritas por ficheiro, sem nada a ganhar.
        actualizar(item.id, { progresso: f }, false)
      })

      // A miniatura é um extra. Se falhar, o ficheiro já está entregue e não se
      // deita fora um upload de 400 MB por causa de uma imagem de 40 KB.
      let thumbKey: string | undefined
      if (item.tipo.startsWith('image/')) {
        try {
          const pequena = await miniatura(item.blob)
          if (pequena) {
            const alvo = await pedirUpload(slug, `mini-${item.nome}.jpg`, 'image/jpeg', pequena.size)
            await enviarFicheiro(alvo.url, pequena, 'image/jpeg', () => {})
            thumbKey = alvo.key
          }
        } catch { /* fica sem miniatura */ }
      }

      const r = await registarUpload(slug, {
        key,
        thumbKey,
        fileName: item.nome,
        contentType: item.tipo,
        sizeBytes: item.tamanho,
        name: item.autor,
      })

      await actualizar(item.id, {
        estado: 'feito',
        progresso: 1,
        key,
        mediaId: r.id,
        blob: null,
        erro: undefined,
      })
    },
    [slug, actualizar],
  )

  /** O motor. Corre enquanto houver ficheiros por enviar e houver rede. */
  const correr = useCallback(async () => {
    if (aCorrer.current) return
    aCorrer.current = true
    setAEnviar(true)
    try {
      for (;;) {
        if (!navigator.onLine) break
        const proximo = itensRef.current.find(
          (i) => i.blob && (i.estado === 'espera' || i.estado === 'a-enviar'),
        )
        if (!proximo) break

        try {
          await enviarUm(proximo)
        } catch (e) {
          const erro = e as ErroEvento
          const tentativas = proximo.tentativas + 1

          // Erros do evento em si não melhoram com insistência: o ficheiro é
          // grande demais, o evento está cheio, ou a janela fechou. Insistir só
          // gastava bateria e dava esperança falsa a quem está a olhar.
          const definitivo =
            erro.estado === 413 || erro.estado === 415 ||
            erro.estado === 403 || erro.estado === 507

          if (definitivo || tentativas >= TENTATIVAS_MAX) {
            await actualizar(proximo.id, { estado: 'erro', tentativas, erro: erro.codigo })
          } else {
            await actualizar(proximo.id, { estado: 'espera', tentativas })
            await dormir(espera(tentativas))
          }
        }
      }
    } finally {
      aCorrer.current = false
      if (montado.current) setAEnviar(false)
    }
  }, [enviarUm, actualizar])

  // Arranque: lê o que ficou de sessões anteriores e retoma-o.
  useEffect(() => {
    montado.current = true
    ;(async () => {
      await limparEnviados(slug)
      const lista = await listar(slug)
      // O que ficou a meio de um envio quando a página fechou volta à espera.
      const limpa = lista.map((i) =>
        i.estado === 'a-enviar' ? { ...i, estado: 'espera' as const, progresso: 0 } : i,
      )
      publicar(limpa)
      if (limpa.some((i) => i.blob && i.estado === 'espera')) correr()
    })()
    return () => { montado.current = false }
  }, [slug, publicar, correr])

  // A rede vai e vem o dia todo numa quinta. Quando volta, retoma-se sozinho.
  useEffect(() => {
    const sobe = () => { setOnline(true); correr() }
    const desce = () => setOnline(false)
    window.addEventListener('online', sobe)
    window.addEventListener('offline', desce)
    return () => {
      window.removeEventListener('online', sobe)
      window.removeEventListener('offline', desce)
    }
  }, [correr])

  const adicionar = useCallback(
    async (ficheiros: File[], autor?: string) => {
      const novos = await juntar(slug, ficheiros, autor)
      publicar([...itensRef.current, ...novos])
      correr()
    },
    [slug, publicar, correr],
  )

  const repetir = useCallback(async () => {
    const lista = itensRef.current.map((i) =>
      i.estado === 'erro' && i.blob ? { ...i, estado: 'espera' as const, tentativas: 0 } : i,
    )
    publicar(lista)
    for (const i of lista) if (i.estado === 'espera') await guardar(i)
    correr()
  }, [publicar, correr])

  const remover = useCallback(
    async (id: string) => {
      await apagar(id)
      publicar(itensRef.current.filter((i) => i.id !== id))
    },
    [publicar],
  )

  const estado: EstadoFila = {
    itens,
    aEnviar,
    online,
    porEnviar: itens.filter((i) => i.estado === 'espera' || i.estado === 'a-enviar').length,
    enviados: itens.filter((i) => i.estado === 'feito').length,
    comErro: itens.filter((i) => i.estado === 'erro').length,
  }

  return { ...estado, adicionar, repetir, remover }
}
