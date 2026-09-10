/**
 * As chamadas às duas Edge Functions do módulo de eventos.
 *
 * Nenhuma delas leva sessão: quem carrega é um convidado sem conta, e o que
 * autoriza é o slug do evento mais a janela de tempo, verificados do lado do
 * servidor. A chave anónima vai no cabeçalho porque o Supabase a exige à
 * entrada, não porque identifique alguém.
 */
import { anonKey, functionsUrl } from '../gallery/config'

export interface InfoEvento {
  coupleName: string
  eventDate: string
  aberto: boolean
  fecha: string
  maxFileBytes: number
}

export interface MediaEvento {
  id: string
  kind: 'foto' | 'video'
  contentType: string | null
  width: number | null
  height: number | null
  takenAt: string | null
  name: string | null
  createdAt: string
  url: string
  thumbUrl: string | null
  /** Verdadeiro nas que este browser carregou. Decidido no servidor. */
  minha?: boolean
}

export interface GaleriaEvento {
  coupleName: string
  eventDate?: string
  aberto?: boolean
  media: MediaEvento[]
  /** Verdadeiro antes da hora de revelação: não vem fotografia nenhuma. */
  escondido?: boolean
  revealAt?: string
}

async function chamar<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  let res: Response
  try {
    res = await fetch(functionsUrl(fn), {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: anonKey() },
      body: JSON.stringify(body),
      // Sem cache: a janela do evento e o que está aprovado mudam durante o
      // dia, e uma resposta guardada faria o convidado ver o estado de há uma
      // hora.
      cache: 'no-store',
    })
  } catch {
    // Estado 0 quer dizer "não houve resposta". É diferente de um erro do
    // servidor, e quem chama trata os dois de maneiras diferentes.
    throw new ErroEvento('sem_rede', 0)
  }
  const dados = await res.json().catch(() => ({}))
  if (!res.ok) throw new ErroEvento(dados.error ?? 'erro', res.status, dados)
  return dados as T
}

export class ErroEvento extends Error {
  codigo: string
  estado: number
  dados: Record<string, unknown>

  constructor(codigo: string, estado: number, dados: Record<string, unknown> = {}) {
    super(codigo)
    this.codigo = codigo
    this.estado = estado
    this.dados = dados
  }
}

const CACHE = (slug: string) => `nebula-evento-${slug}`

/**
 * O que a página precisa de saber sobre o evento, e uma cópia local dele.
 *
 * A cópia existe porque a rede num casamento não é uma garantia. Sem ela, uma
 * convidada que abrisse o link fora de alcance via um ecrã de erro em vez da
 * página, e as fotografias que já tivesse na fila ficavam invisíveis para ela
 * — guardadas na mesma, mas sem nada que lho dissesse. Guardar quatro campos
 * no browser resolve isso, e o pior que uma cópia velha faz é mostrar o nome
 * dos noivos escrito de outra maneira.
 */
export async function infoEvento(slug: string): Promise<{ info: InfoEvento; deCache: boolean }> {
  try {
    const info = await chamar<InfoEvento>('event-upload', { action: 'info', slug })
    try { localStorage.setItem(CACHE(slug), JSON.stringify(info)) } catch { /* modo privado */ }
    return { info, deCache: false }
  } catch (e) {
    // Um 404 é uma resposta: o evento não existe, e nenhuma cópia local o
    // ressuscita. Já uma falha de rede não diz nada sobre o evento, e é aí que
    // a cópia serve.
    if (e instanceof ErroEvento && e.estado > 0) {
      if (e.codigo === 'nao_encontrado') localStorage.removeItem(CACHE(slug))
      throw e
    }
    const guardado = localStorage.getItem(CACHE(slug))
    if (!guardado) throw e
    return { info: JSON.parse(guardado) as InfoEvento, deCache: true }
  }
}

export const galeriaEvento = (slug: string, uploaderKey: string) =>
  chamar<GaleriaEvento>('event-gallery', { slug, uploaderKey })

export const pedirUpload = (
  slug: string,
  fileName: string,
  contentType: string,
  sizeBytes: number,
) => chamar<{ key: string; url: string }>('event-upload', {
  action: 'upload-url', slug, fileName, contentType, sizeBytes,
})

export const registarUpload = (slug: string, corpo: Record<string, unknown>) =>
  chamar<{ ok: true; id?: string }>('event-upload', { action: 'registar', slug, ...corpo })

/**
 * Apaga uma fotografia que este browser enviou.
 *
 * Um 404 não é tratado como erro: quer dizer que ela já lá não está, e o que a
 * pessoa queria era que não estivesse. Insistir a dizer que falhou seria
 * discutir sobre um resultado que já é o certo.
 */
export async function removerDoServidor(slug: string, id: string, uploaderKey: string) {
  try {
    await chamar('event-upload', { action: 'remover', slug, id, uploaderKey })
  } catch (e) {
    if (e instanceof ErroEvento && e.estado === 404) return
    throw e
  }
}

/**
 * PUT do ficheiro para o R2, com progresso.
 *
 * É `XMLHttpRequest` e não `fetch` porque só o primeiro dá progresso de envio
 * em todos os browsers. Num casamento isto não é um detalhe de conforto: um
 * vídeo de 400 MB numa rede fraca demora minutos, e sem a barra a mexer a
 * pessoa assume que encravou e fecha a página.
 */
export function enviarFicheiro(
  url: string,
  blob: Blob,
  contentType: string,
  aoProgresso: (fraccao: number) => void,
  sinal?: AbortSignal,
): Promise<void> {
  return new Promise((ok, falha) => {
    const x = new XMLHttpRequest()
    x.open('PUT', url)
    x.setRequestHeader('content-type', contentType)
    x.upload.onprogress = (e) => {
      if (e.lengthComputable) aoProgresso(e.loaded / e.total)
    }
    x.onload = () =>
      x.status >= 200 && x.status < 300
        ? ok()
        : falha(new ErroEvento('falha_upload', x.status))
    x.onerror = () => falha(new ErroEvento('sem_rede', 0))
    x.ontimeout = () => falha(new ErroEvento('sem_rede', 0))
    sinal?.addEventListener('abort', () => x.abort(), { once: true })
    x.send(blob)
  })
}
