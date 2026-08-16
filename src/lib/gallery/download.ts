import { zip } from 'fflate'
import type { SignedPhoto } from './types'

/** Descarrega um ficheiro único a partir de um URL assinado. */
export async function downloadOne(photo: SignedPhoto) {
  if (!photo.url) throw new Error('Foto indisponível.')
  const res = await fetch(photo.url)
  if (!res.ok) throw new Error('Não foi possível descarregar a foto.')
  const blob = await res.blob()
  triggerSave(blob, photo.fileName)
}

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
    const res = await fetch(photo.url, { signal })
    if (!res.ok) throw new Error(`Falhou ao obter ${photo.fileName}.`)
    const buf = new Uint8Array(await res.arrayBuffer())

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
