/**
 * O lado do convidado: ler a mostra, sem conta nenhuma.
 *
 * Uma função só, e é de propósito que não há mais nenhuma. Esta página não
 * carrega, não apaga, não descarrega e não guarda nada: só lê. Cada coisa que
 * ela não sabe fazer é uma coisa que não pode correr mal em cima de uma mesa a
 * meio de um casamento.
 */
import { anonKey, functionsUrl } from '../gallery/config'

export interface FotoPublica {
  numero: number
  thumbUrl: string
  url: string
  width: number | null
  height: number | null
}

export interface PaginaMostra {
  name: string
  eventDate: string | null
  /** Quando fechou. Nulo é aberta. */
  expiresAt: string | null
  terminada: boolean
  fotos: FotoPublica[]
  /** O número a pedir a seguir, ou nulo quando já não há mais à frente. */
  proximo: number | null
}

export class ErroMostra extends Error {
  codigo: string
  estado: number

  constructor(codigo: string, estado: number) {
    super(codigo)
    this.codigo = codigo
    this.estado = estado
  }
}

export async function lerMostra(slug: string, depois?: number | null): Promise<PaginaMostra> {
  let res: Response
  try {
    res = await fetch(functionsUrl('print-gallery'), {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: anonKey() },
      body: JSON.stringify({ slug, depois: depois ?? 0 }),
      // Sem cache: entram fotografias novas de minuto a minuto, e uma resposta
      // guardada mostrava a mesa como ela estava há meia hora.
      cache: 'no-store',
      /*
        Vinte segundos. Isto são umas dezenas de kilobytes de JSON: numa rede
        de casamento pode demorar, mas não tanto. Sem tecto, um pedido
        pendurado numa ligação meio aberta deixava a página a girar para
        sempre, que é a única coisa que não se pode dar ao luxo aqui.
      */
      signal: AbortSignal.timeout(20000),
    })
  } catch {
    throw new ErroMostra('sem_rede', 0)
  }
  const dados = await res.json().catch(() => ({}))
  if (!res.ok) throw new ErroMostra(dados.error ?? 'erro', res.status)
  return dados as PaginaMostra
}
