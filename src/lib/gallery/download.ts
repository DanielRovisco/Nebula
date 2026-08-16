import { zip } from 'fflate'
import type { SignedPhoto } from './types'

/**
 * Busca com nova tentativa.
 *
 * Numa galeria de 300 ficheiros e numa ligação de telemóvel, uma falha isolada
 * é quase certa — e sem isto essa falha deitava por terra o download inteiro,
 * já com centenas de megabytes transferidos. Três tentativas, com espera a
 * dobrar, resolvem a esmagadora maioria delas.
 */
async function fetchComRetry(url: string, signal?: AbortSignal, tentativas = 3): Promise<Response> {
  let ultimoErro: unknown
  for (let i = 0; i < tentativas; i++) {
    if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError')
    try {
      const res = await fetch(url, { signal })
      if (res.ok) return res
      // 4xx não melhora à segunda: o URL assinado expirou ou nunca foi válido.
      if (res.status >= 400 && res.status < 500) throw new Error(`HTTP ${res.status}`)
      ultimoErro = new Error(`HTTP ${res.status}`)
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e
      ultimoErro = e
    }
    await new Promise((r) => setTimeout(r, 500 * 2 ** i))
  }
  throw ultimoErro instanceof Error ? ultimoErro : new Error('Falha de rede.')
}

/** Descarrega um ficheiro único a partir de um URL assinado. */
export async function downloadOne(photo: SignedPhoto, web = false) {
  if (!photo.url) throw new Error('Foto indisponível.')
  const res = await fetchComRetry(photo.url)
  if (!web) {
    triggerSave(await res.blob(), photo.fileName)
    return
  }
  const reduzido = await paraWeb(new Uint8Array(await res.arrayBuffer()), photo.contentType)
  triggerSave(new Blob([reduzido.buffer as ArrayBuffer]), photo.fileName)
}

/**
 * O que já foi transferido nesta visita, por URL.
 *
 * Se o download falhar a meio e a pessoa tentar outra vez, os ficheiros já
 * obtidos não voltam a ser pedidos — recomeça-se de onde ficou em vez de do
 * princípio. Vive só em memória: fechar o separador limpa tudo, o que também
 * impede a galeria inteira de ficar guardada sem ninguém pedir.
 */
const jaObtidos = new Map<string, Uint8Array>()

export interface ZipProgress {
  done: number
  total: number
  phase: 'a descarregar' | 'a compactar'
}

/**
 * Junta a galeria toda num ZIP, montado no browser.
 *
 * Nota de limite: o ZIP é construído em memória, por isso galerias muito
 * grandes (na ordem dos GB) podem esgotar a memória do dispositivo — sobretudo
 * em telemóvel. Acima de ZIP_WARN_BYTES a interface avisa e sugere descarregar
 * por partes.
 */
export const ZIP_WARN_BYTES = 1_500_000_000

/** Lado maior da versão "web". Chega para publicar em qualquer lado. */
export const WEB_EDGE = 2048

/**
 * Reduz um ficheiro já descarregado para a versão web.
 *
 * Feito no browser, sobre o que já veio da rede — não há segunda cópia guardada
 * no R2 nem espaço gasto a dobrar. Vídeos passam intactos: recodificar vídeo
 * aqui não é viável, e entregar um vídeo pela metade era pior do que entregá-lo
 * inteiro.
 */
async function paraWeb(dados: Uint8Array, contentType: string | null): Promise<Uint8Array> {
  if (contentType?.startsWith('video/')) return dados
  try {
    const copia = new Uint8Array(dados)
    const bitmap = await createImageBitmap(new Blob([copia.buffer as ArrayBuffer]))
    const escala = Math.min(1, WEB_EDGE / Math.max(bitmap.width, bitmap.height))
    if (escala === 1) {
      bitmap.close()
      return dados
    }
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * escala)
    canvas.height = Math.round(bitmap.height * escala)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85))
    if (!blob) return dados
    return new Uint8Array(await blob.arrayBuffer())
  } catch {
    // Formato que o browser não descodifica: entrega-se o original.
    return dados
  }
}

export async function downloadAll(
  photos: SignedPhoto[],
  galleryTitle: string,
  onProgress: (p: ZipProgress) => void,
  signal?: AbortSignal,
  /**
   * Acrescentado ao nome do ZIP. Serve para distinguir a entrega completa do
   * download só das escolhidas: com dois ficheiros na pasta das transferências,
   * ambos chamados "ana-e-tiago.zip", ninguém sabe qual é qual.
   */
  sufixo?: string,
  /** Reduz cada fotografia para 2048px antes de a meter no ZIP. */
  web = false,
) {
  const files: Record<string, Uint8Array> = {}
  const used = new Set<string>()
  let done = 0

  for (const photo of photos) {
    if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError')
    if (!photo.url) continue

    let buf = jaObtidos.get(photo.url)
    if (!buf) {
      const res = await fetchComRetry(photo.url, signal)
      buf = new Uint8Array(await res.arrayBuffer())
      jaObtidos.set(photo.url, buf)
    }
    // A redução fica fora da cache: o que se guarda é o que veio da rede, para
    // trocar de tamanho não obrigar a descarregar tudo outra vez.
    const conteudo = web ? await paraWeb(buf, photo.contentType) : buf

    // Nomes repetidos dentro do ZIP silenciariam ficheiros: desambigua.
    let name = photo.fileName
    if (used.has(name)) {
      const dot = name.lastIndexOf('.')
      const stem = dot > 0 ? name.slice(0, dot) : name
      const ext = dot > 0 ? name.slice(dot) : ''
      let n = 2
      while (used.has(`${stem}-${n}${ext}`)) n++
      name = `${stem}-${n}${ext}`
    }
    used.add(name)
    files[name] = conteudo

    onProgress({ done: ++done, total: photos.length, phase: 'a descarregar' })
  }

  onProgress({ done: photos.length, total: photos.length, phase: 'a compactar' })

  const blob = await new Promise<Blob>((resolve, reject) => {
    // level 0: as fotografias já são JPEG/WebP comprimidos. Tentar comprimir
    // outra vez só gasta tempo e memória para poupar quase nada.
    zip(files, { level: 0 }, (err, data) => {
      if (err) reject(err)
      // `data` é uma view sobre o buffer do fflate; copia-se para o Blob poder
      // sobreviver por conta própria.
      else resolve(new Blob([new Uint8Array(data)], { type: 'application/zip' }))
    })
  })

  triggerSave(blob, `${slugify(galleryTitle)}${sufixo ? `-${slugify(sufixo)}` : ''}.zip`)
}

function triggerSave(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revogar de imediato cancela downloads em curso nalguns browsers.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // tira acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'galeria'
