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
export async function downloadOne(photo: SignedPhoto) {
  if (!photo.url) throw new Error('Foto indisponível.')
  const res = await fetchComRetry(photo.url)
  const blob = await res.blob()
  triggerSave(blob, photo.fileName)
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
    files[name] = buf

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
