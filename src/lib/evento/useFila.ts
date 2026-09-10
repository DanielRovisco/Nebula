import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ErroEvento, enviarFicheiro, pedirUpload, registarUpload, removerDoServidor,
} from './api'
import {
  type ItemFila,
  apagar, copiaDuravel, guardar, juntar, legivel, limparEnviados, listar, minhaChave,
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

  /**
   * Sobe um ficheiro: pede o endereço, envia, e regista.
   *
   * Os três passos são retomáveis um a um. Se a rede cair entre o segundo e o
   * terceiro, a tentativa seguinte não volta a mandar os 400 MB: já tem a chave
   * guardada e continua de onde estava. Era esse o caminho que enchia o bucket
   * de ficheiros órfãos, pagos e invisíveis.
   */
  const enviarUm = useCallback(
    async (item: ItemFila) => {
      await actualizar(item.id, { estado: 'a-enviar', progresso: 0, erro: undefined })

      let key = item.key
      if (!key) {
        /*
          O ficheiro tem de estar mesmo lá. Antes isto era um `return` calado, e
          o efeito era o pior possível: o item ficava marcado como "a enviar", o
          motor voltava a encontrá-lo, voltava a chamar, voltava a devolver — um
          ciclo infinito que não enviava nada e não deixava passar mais
          ninguém. Uma roda a girar para sempre e uma fila parada atrás dela.

          Agora é um erro, e um erro definitivo: um ficheiro que já não se lê
          não melhora à quinta tentativa. A pessoa vê "escolhe outra vez", que
          é a única coisa que ela pode fazer.
        */
        const ficheiro = item.blob
        if (!ficheiro || !(await legivel(ficheiro))) {
          throw new ErroEvento('ficheiro_perdido', 410)
        }

        const pedido = await pedirUpload(slug, item.nome, item.tipo, item.tamanho)
        await enviarFicheiro(pedido.url, ficheiro, item.tipo, (f) => {
          // O progresso não vai ao disco: escrever no IndexedDB a cada pedaço
          // enviado dava centenas de escritas por ficheiro, sem nada a ganhar.
          actualizar(item.id, { progresso: f }, false)
        })
        key = pedido.key
        // Ao disco antes de qualquer outra coisa: a partir daqui, este ficheiro
        // está entregue, aconteça o que acontecer aos passos seguintes.
        await actualizar(item.id, { key, progresso: 1 })
      }

      // A miniatura é um extra. Se falhar, o ficheiro já está entregue e não se
      // deita fora um upload de 400 MB por causa de uma imagem de 40 KB.
      let thumbKey = item.thumbKey
      if (!thumbKey && item.tipo.startsWith('image/') && item.miniatura) {
        try {
          const alvo = await pedirUpload(slug, `mini-${item.nome}.jpg`, 'image/jpeg', item.miniatura.size)
          await enviarFicheiro(alvo.url, item.miniatura, 'image/jpeg', () => {})
          thumbKey = alvo.key
          await actualizar(item.id, { thumbKey })
        } catch { /* fica sem miniatura no servidor; a local continua cá */ }
      }

      const r = await registarUpload(slug, {
        key,
        thumbKey,
        fileName: item.nome,
        contentType: item.tipo,
        sizeBytes: item.tamanho,
        name: item.autor,
        uploaderKey: minhaChave(slug),
        // O identificador do envio. Se este registo já tiver sido feito e só a
        // resposta se tiver perdido, o servidor reconhece-o e devolve o mesmo
        // id em vez de criar uma segunda linha.
        clientId: item.id,
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
        /*
          Tudo o que não está entregue nem falhado é para tentar, sem excepção.

          Havia aqui um `i.blob || i.key`, para saltar o que não tivesse nada
          para enviar. O efeito era o contrário do pretendido: um ficheiro que
          deixasse de ser legível não era saltado com um aviso, era saltado em
          silêncio. Ficava para sempre em "a enviar", sem erro, sem botão, e sem
          nada que a pessoa pudesse fazer. Um item que não dá para enviar tem de
          falhar em voz alta, e é o `enviarUm` que o diz.
        */
        const porFazer = itensRef.current.filter(
          (i) => i.estado === 'espera' || i.estado === 'a-enviar',
        )
        if (porFazer.length === 0) break

        /*
          O que já cumpriu o seu descanso. Um ficheiro que falhou espera antes
          de nova tentativa, mas esse tempo é dele e não da fila: os outros
          continuam a subir enquanto ele espera.

          Antes o descanso era um `await` no meio do ciclo, e uma fotografia
          teimosa com cinco tentativas segurava tudo o que viesse a seguir
          durante quase um minuto.
        */
        const agora = Date.now()
        const proximo = porFazer.find((i) => !i.tentarApos || i.tentarApos <= agora)
        if (!proximo) {
          const espera = Math.min(...porFazer.map((i) => i.tentarApos ?? agora)) - agora
          await dormir(Math.max(500, Math.min(espera, 5000)))
          continue
        }

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
            erro.estado === 403 || erro.estado === 507 ||
            // O ficheiro deixou de estar legível neste browser.
            erro.estado === 410

          if (definitivo || tentativas >= TENTATIVAS_MAX) {
            await actualizar(proximo.id, { estado: 'erro', tentativas, erro: erro.codigo })
          } else {
            await actualizar(proximo.id, {
              estado: 'espera',
              tentativas,
              tentarApos: Date.now() + espera(tentativas),
              progresso: 0,
            })
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
      if (limpa.some((i) => i.estado === 'espera')) correr()
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

      /*
        A grelha aparece primeiro e as miniaturas entram a seguir, uma a uma.
        É a ordem que faz a página parecer instantânea: escolher trinta
        fotografias mostra trinta espaços de imediato, em vez de deixar o dedo
        no ar enquanto o telemóvel decodifica trinta JPEGs de 12 megapixéis.
      */
      publicar([...itensRef.current, ...novos])
      correr()

      /*
        A seguir, e em segundo plano, duas coisas por ficheiro: uma cópia dos
        bytes que sobreviva a fechar a página, e a miniatura.

        A cópia vem primeiro porque é a que evita perder a fotografia. Um a um
        e não todos de uma vez: trinta fotografias copiadas em paralelo são
        trinta ficheiros em memória ao mesmo tempo.
      */
      for (const it of novos) {
        if (!it.blob) continue

        const copia = await copiaDuravel(it.blob, it.tipo)
        if (copia) await actualizar(it.id, { blob: copia })

        if (!it.tipo.startsWith('image/')) continue
        const pequena = await miniatura(copia ?? it.blob)
        if (pequena) await actualizar(it.id, { miniatura: pequena })
      }
    },
    [slug, publicar, correr, actualizar],
  )

  const repetir = useCallback(async () => {
    const lista = itensRef.current.map((i) =>
      i.estado === 'erro'
        ? { ...i, estado: 'espera' as const, tentativas: 0, tentarApos: undefined }
        : i,
    )
    publicar(lista)
    for (const i of lista) if (i.estado === 'espera') await guardar(i)
    correr()
  }, [publicar, correr])

  /**
   * Tira uma fotografia da lista, e do servidor se já lá tiver chegado.
   *
   * Primeiro o servidor, depois o registo local. Pela ordem contrária, uma
   * falha de rede deixava a fotografia no casamento e o convidado convencido de
   * que a tinha apagado, que é a pior das duas maneiras de falhar.
   */
  const remover = useCallback(
    async (id: string) => {
      const item = itensRef.current.find((i) => i.id === id)
      if (!item) return
      if (item.mediaId) await removerDoServidor(slug, item.mediaId, minhaChave(slug))
      await apagar(id)
      publicar(itensRef.current.filter((i) => i.id !== id))
    },
    [slug, publicar],
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
