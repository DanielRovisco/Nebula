import { zip } from 'fflate'
import { descarregarBlob, guardarBlob, guardarFicheiro } from '../guardarFicheiro'
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
      /*
        `no-store` não é por causa de dados velhos: é para não ler a cache.

        Quem vê uma fotografia na galeria fá-lo através de uma `<img>`, e uma
        `<img>` não é um pedido de CORS. O browser guarda essa resposta em
        cache sem cabeçalhos de CORS, porque nunca foram pedidos. Ao
        descarregar, o `fetch` pede o mesmo endereço, recebe de volta essa
        cópia guardada, não encontra lá o `Access-Control-Allow-Origin` e
        recusa — com a mesma mensagem que dá um bucket mal configurado, mesmo
        estando o bucket impecável.

        Foi isto que fez "algumas fotos" falharem e outras não: falhavam
        exactamente as que já tinham sido abertas. Verificado com um OPTIONS
        directo ao R2, que devolvia os cabeçalhos todos certos enquanto o
        browser insistia em bloquear.

        A alternativa era pôr `crossOrigin` nas imagens da galeria, para a
        cópia guardada já vir com cabeçalhos. Não se fez: isso passaria a
        obrigar o CORS a estar bom para as fotografias sequer aparecerem, e
        mais vale o download falhar do que a galeria do cliente ficar vazia.

        O custo é descarregar de novo o que já estava em cache. É pequeno: a
        grelha mostra miniaturas, não os originais, e o ZIP já tem a sua
        própria cache em memória.
      */
      const res = await fetch(url, { signal, cache: 'no-store' })
      if (res.ok) return res
      // 4xx não melhora à segunda: o URL assinado expirou ou nunca foi válido.
      if (res.status >= 400 && res.status < 500) throw new Error(`HTTP ${res.status}`)
      ultimoErro = new Error(`HTTP ${res.status}`)
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e
      /*
        Um bloqueio de CORS chega aqui como um TypeError sem mais nada: o
        browser recusa-se a dizer ao script o que correu mal. Repetir três
        vezes não ajuda — a configuração do bucket não muda entre tentativas —
        e só faz o cliente esperar mais para receber o mesmo erro.

        A mensagem vai para a consola porque é a única pista que há: para quem
        está a ver a galeria isto é "não deu", e sem esta linha não há por onde
        começar a procurar. Já nos custou uma tarde à conta de a resposta não
        dizer nada.
      */
      if (e instanceof TypeError) {
        console.error(
          'Download bloqueado pelo CORS do bucket R2. ' +
            'Cloudflare → R2 → bucket das galerias → Settings → CORS policy: ' +
            'a origem deste site tem de estar em AllowedOrigins e GET em AllowedMethods. ' +
            'O ficheiro supabase/r2-cors.json do repositório tem a política correcta.',
        )
        throw new Error('CORS', { cause: e })
      }
      ultimoErro = e
    }
    await new Promise((r) => setTimeout(r, 500 * 2 ** i))
  }
  throw ultimoErro instanceof Error ? ultimoErro : new Error('Falha de rede.')
}

/**
 * Descarrega um ficheiro único.
 *
 * O caminho normal é um URL assinado que o R2 devolve como anexo
 * (`response-content-disposition`), entregue pelo menu de partilha do sistema
 * quando o aparelho o tem, e por um link quando não tem. O link não é um
 * pedido de CORS: o browser descarrega e não pergunta nada ao bucket, e é isso
 * que o torna a rede de segurança de tudo o resto.
 *
 * O menu importa sobretudo nos vídeos e no iPhone. Em iOS um link para um
 * vídeo abre muitas vezes o leitor em vez de descarregar, e quando descarrega
 * vai para os Ficheiros e não para as Fotos. Pelo menu há "Guardar vídeo".
 *
 * Só se recorre ao `fetch` directo quando não há alternativa: quando a galeria
 * foi aberta com uma versão antiga da Edge Function que ainda não devolve
 * `downloadUrl`. Mesmo aí o ficheiro acaba no mesmo sítio, porque o
 * `guardarBlob` faz o que o `guardarFicheiro` faz.
 */
export async function downloadOne(photo: SignedPhoto) {
  if (photo.downloadUrl) {
    await guardarFicheiro(
      photo.downloadUrl, photo.fileName, photo.contentType, photo.sizeBytes ?? undefined,
    )
    return
  }
  if (!photo.url) throw new Error('Foto indisponível.')
  const res = await fetchComRetry(photo.url)
  await guardarBlob(await res.blob(), photo.fileName, photo.contentType)
}

/**
 * Guarda a cópia leve de um vídeo em vez do original.
 *
 * O original de uma câmara tem centenas de megabytes e numa rede de telemóvel
 * isso são muitos minutos de espera. A cópia leve é a que o cliente acabou de
 * ver, cabe no telefone e é a que serve para mandar a alguém. Quem quiser o
 * ficheiro como ele é continua a poder levá-lo.
 *
 * O nome leva "leve" à frente e a extensão do formato da cópia, não a do
 * original: a cópia de um `.mov` é um MP4 ou um WebM, e uma extensão errada é um
 * ficheiro que o sistema não sabe abrir. O painel usa o mesmo nome na
 * pré-visualização, por isso ele vive à parte.
 */
export function nomeDaCopiaLeve(fileName: string, previewType: string | null | undefined) {
  const base = fileName.replace(/\.[^.]+$/, '')
  return `leve-${base}.${/webm/i.test(previewType ?? '') ? 'webm' : 'mp4'}`
}

export async function downloadLeve(photo: SignedPhoto) {
  if (!photo.previewDownloadUrl) throw new Error('Sem cópia leve.')
  await guardarFicheiro(
    photo.previewDownloadUrl,
    nomeDaCopiaLeve(photo.fileName, photo.previewType),
    photo.previewType,
    photo.previewBytes ?? undefined,
  )
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

/*
  A versão reduzida continua implementada, mas hoje nada a pede: o seletor de
  tamanho saiu da galeria e descarrega-se sempre o original. Fica porque
  voltar a oferecê-la é acrescentar um botão que passe `web: true`, e não
  reescrever isto.
*/
/** Lado maior da versão "web". Chega para publicar em qualquer lado. */

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
    const conteudo = buf

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

  /*
    O ZIP vai pelo caminho normal e não pelo menu de partilha do iOS.

    Um ZIP não é uma fotografia: o menu do iOS não lhe oferece "Guardar imagem",
    oferece "Guardar em Ficheiros", que é exactamente onde o download também o
    põe. E partilhar obriga a ter o ficheiro inteiro em memória outra vez, o que
    num casamento são gigabytes.
  */
  descarregarBlob(blob, `${slugify(galleryTitle)}${sufixo ? `-${slugify(sufixo)}` : ''}.zip`)
}

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // tira acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'galeria'
