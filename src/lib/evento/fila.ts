/**
 * A fila de uploads dos convidados.
 *
 * O problema que esta fila resolve não é técnico, é do sítio: num casamento, a
 * rede é má. Cento e cinquenta pessoas no mesmo canto de uma quinta, com um
 * único poste a servir toda a gente, e metade delas a filmar. Um upload que
 * dependa de a ligação aguentar do princípio ao fim vai falhar, e a convidada
 * que perdeu três minutos a olhar para uma barra não tenta segunda vez.
 *
 * Por isso os ficheiros entram primeiro no IndexedDB e só depois sobem. Uma vez
 * escolhidos, estão guardados: a convidada pode bloquear o telemóvel, sair da
 * página, ficar sem rede, apanhar boleia para casa, e o envio continua da
 * próxima vez que abrir o link. Nada se perde por se ter fechado o separador.
 *
 * Guarda-se o `File` tal e qual, sem tocar nos bytes. É o que garante a
 * qualidade original que foi prometida, e é também o que permite retomar: um
 * blob no IndexedDB sobrevive ao recarregar, ao contrário de uma referência a
 * um ficheiro do disco, que morre com a página.
 */

const BD = 'nebula-eventos'
const LOJA = 'ficheiros'
const VERSAO = 1

/**
 * A chave deste browser, por evento.
 *
 * É o mais perto de uma identidade que esta página tem, e de propósito: não
 * viaja para lado nenhum a não ser com os uploads, não diz quem a pessoa é, e
 * desaparece se ela limpar os dados do site. Serve uma coisa só, que é deixá-la
 * apagar o que ela própria enviou.
 */
export function minhaChave(slug: string): string {
  const nome = `nebula-chave-${slug}`
  try {
    const guardada = localStorage.getItem(nome)
    if (guardada) return guardada
    const nova = [...crypto.getRandomValues(new Uint8Array(16))]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    localStorage.setItem(nome, nova)
    return nova
  } catch {
    // Modo privado sem armazenamento: gera-se uma para esta sessão. Perde-se
    // ao fechar, e o pior que acontece é deixar de dar para apagar o que se
    // enviou. O upload em si continua a funcionar.
    return [...crypto.getRandomValues(new Uint8Array(16))]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
}

export type EstadoItem = 'espera' | 'a-enviar' | 'feito' | 'erro'

export interface ItemFila {
  id: string
  slug: string
  /** O ficheiro original. Apagado depois de subir, para não encher o telemóvel. */
  blob: Blob | null
  /**
   * Miniatura, guardada mesmo depois de o original ir embora.
   *
   * São umas dezenas de quilobytes por fotografia, e é o que faz a grelha ter
   * imagens em vez de nomes de ficheiros — inclusive sem rede, e inclusive
   * antes de o upload começar. Trinta fotografias dão menos de dois megabytes
   * guardados, o que é barato para o que se ganha.
   */
  miniatura?: Blob | null
  nome: string
  tipo: string
  tamanho: number
  estado: EstadoItem
  tentativas: number
  /** Progresso do envio, de 0 a 1. Não é guardado entre sessões. */
  progresso: number
  /**
   * A partir de quando vale a pena tentar outra vez, em milissegundos.
   *
   * Existe para o descanso entre tentativas de um ficheiro não ser o descanso
   * de todos: enquanto este espera, os outros seguem.
   */
  tentarApos?: number
  /**
   * A chave no R2, escrita assim que o PUT passa.
   *
   * É o que impede o mesmo ficheiro de subir duas vezes. Sem isto, uma falha no
   * passo seguinte (o registo) mandava a fila repetir tudo do princípio, e o
   * primeiro ficheiro ficava no bucket para sempre, pago e sem ninguém saber
   * que lá estava.
   */
  key?: string
  /** Chave da miniatura, pela mesma razão. */
  thumbKey?: string
  /** Id da linha na base de dados, para o convidado poder ver o que carregou. */
  mediaId?: string
  erro?: string
  criadoEm: number
  /** Nome que a pessoa escreveu, se escreveu. */
  autor?: string
}

/**
 * Acima deste tamanho não se copia o ficheiro: envia-se o original.
 *
 * Copiar obriga a ter os bytes todos em memória de uma vez. Para fotografias
 * (5 a 15 MB) não custa nada; para um vídeo de 400 MB era pedir a um telemóvel
 * antigo que o fizesse a meio de uma festa, e o que se ganhava em segurança
 * perdia-se num separador que rebenta.
 */
const LIMITE_COPIA = 80 * 1024 * 1024

/**
 * Uma cópia dos bytes, independente do ficheiro que está no disco.
 *
 * Um `File` escolhido num `<input>` não é uma fotografia: é uma referência para
 * uma cópia temporária que o sistema fez. Guardá-lo no IndexedDB guarda a
 * referência, e no Safari do iPhone essa referência morre quando a página
 * fecha. Reabrir e encontrar um ficheiro ilegível era exactamente o que estava
 * a acontecer: as fotografias escolhidas antes de fechar nunca subiam, e as
 * escolhidas depois subiam sempre, porque essas ainda estavam vivas em memória.
 *
 * Copiar os bytes desfaz isso. O que fica guardado passa a ser a fotografia, e
 * não a morada dela.
 */
export async function copiaDuravel(blob: Blob, tipo: string): Promise<Blob | null> {
  if (blob.size > LIMITE_COPIA) return null
  try {
    return new Blob([await blob.arrayBuffer()], { type: tipo })
  } catch {
    return null
  }
}

/** Confirma que ainda se consegue ler o ficheiro antes de o tentar enviar. */
export async function legivel(blob: Blob | null | undefined): Promise<boolean> {
  if (!blob || blob.size === 0) return false
  try {
    await blob.slice(0, 1).arrayBuffer()
    return true
  } catch {
    return false
  }
}

let bd: Promise<IDBDatabase> | null = null

function abrir(): Promise<IDBDatabase> {
  if (bd) return bd
  bd = new Promise((ok, falha) => {
    const p = indexedDB.open(BD, VERSAO)
    p.onupgradeneeded = () => {
      const d = p.result
      if (!d.objectStoreNames.contains(LOJA)) {
        const loja = d.createObjectStore(LOJA, { keyPath: 'id' })
        loja.createIndex('slug', 'slug')
      }
    }
    p.onsuccess = () => ok(p.result)
    p.onerror = () => falha(p.error)
  })
  return bd
}

async function tx<T>(modo: IDBTransactionMode, fn: (loja: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await abrir()
  return new Promise((ok, falha) => {
    const t = d.transaction(LOJA, modo)
    const pedido = fn(t.objectStore(LOJA))
    pedido.onsuccess = () => ok(pedido.result)
    pedido.onerror = () => falha(pedido.error)
  })
}

/** Tudo o que está guardado para este evento, do mais antigo para o mais novo. */
export async function listar(slug: string): Promise<ItemFila[]> {
  const d = await abrir()
  return new Promise((ok, falha) => {
    const t = d.transaction(LOJA, 'readonly')
    const p = t.objectStore(LOJA).index('slug').getAll(slug)
    p.onsuccess = () => ok((p.result as ItemFila[]).sort((a, b) => a.criadoEm - b.criadoEm))
    p.onerror = () => falha(p.error)
  })
}

export async function guardar(item: ItemFila): Promise<void> {
  await tx('readwrite', (l) => l.put(item) as IDBRequest<IDBValidKey>)
}

export async function apagar(id: string): Promise<void> {
  await tx('readwrite', (l) => l.delete(id) as unknown as IDBRequest<undefined>)
}

/**
 * Põe ficheiros na fila. Não envia nada: só os guarda.
 *
 * A separação é de propósito. Escolher ficheiros tem de ser instantâneo mesmo
 * com trinta fotografias de uma vez, e o envio é outro assunto, que corre ao
 * seu ritmo e pode ser interrompido sem consequências.
 */
export async function juntar(slug: string, ficheiros: File[], autor?: string): Promise<ItemFila[]> {
  const agora = Date.now()
  const itens: ItemFila[] = ficheiros.map((f, i) => ({
    id: `${agora}-${i}-${Math.random().toString(36).slice(2, 8)}`,
    slug,
    blob: f,
    nome: f.name,
    tipo: f.type || 'application/octet-stream',
    tamanho: f.size,
    estado: 'espera',
    tentativas: 0,
    progresso: 0,
    criadoEm: agora + i,
    autor,
  }))
  for (const it of itens) await guardar(it)
  return itens
}

/**
 * Apaga o que já subiu e ficou para trás.
 *
 * Corre-se à entrada, e não a seguir a cada envio, porque o que interessa é que
 * o espaço não fique preso indefinidamente, não que seja libertado no segundo
 * exacto. Os registos e as miniaturas ficam (é o que permite ao convidado ver o
 * que carregou); o que se larga é o original, que é onde estão os bytes todos.
 */
export async function limparEnviados(slug: string): Promise<void> {
  for (const it of await listar(slug)) {
    if (it.estado === 'feito' && it.blob) await guardar({ ...it, blob: null })
  }
}
