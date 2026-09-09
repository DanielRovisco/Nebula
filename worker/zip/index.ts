/**
 * Cloudflare Worker: descarregar um casamento inteiro num ZIP.
 *
 * Existe porque não há mais sítio onde isto possa correr. O site é estático no
 * GitHub Pages e as Edge Functions do Supabase têm limites de memória e de
 * tempo que um casamento de dezenas de gigabytes ultrapassa sem esforço.
 *
 * O que o torna possível é o ZIP ir a sair enquanto se constrói. Nunca há um
 * ficheiro completo em memória nem em disco: lê-se um objecto do R2, escreve-se
 * no fluxo de resposta, passa-se ao seguinte. O browser vê um download normal a
 * andar desde o primeiro segundo, e o tamanho total é irrelevante.
 *
 * Formato: ZIP sem compressão (método 0), com descritor de dados a seguir a
 * cada ficheiro. Sem compressão porque JPEG e MP4 já estão comprimidos e
 * tentar outra vez gasta processador para poupar quase nada. O descritor é o
 * que permite escrever o cabeçalho antes de se saber o tamanho e a soma de
 * verificação do ficheiro, que é o que torna o streaming possível.
 *
 * Configuração (wrangler.toml):
 *   - ligação ao bucket R2 das galerias
 *   - SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY como secrets
 */

interface Env {
  BUCKET: R2Bucket
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

/** Tabela do CRC-32, calculada uma vez por instância do Worker. */
const TABELA_CRC = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c >>> 0
  }
  return t
})()

/** CRC-32 em pedaços, para não precisar do ficheiro todo de uma vez. */
class Crc32 {
  private c = 0xffffffff
  atualiza(d: Uint8Array) {
    let c = this.c
    for (let i = 0; i < d.length; i++) c = TABELA_CRC[(c ^ d[i]) & 0xff] ^ (c >>> 8)
    this.c = c
  }
  get valor() {
    return (this.c ^ 0xffffffff) >>> 0
  }
}

const u16 = (n: number) => new Uint8Array([n & 0xff, (n >> 8) & 0xff])
const u32 = (n: number) =>
  new Uint8Array([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff])

function juntar(...partes: Uint8Array[]) {
  const total = partes.reduce((s, p) => s + p.length, 0)
  const out = new Uint8Array(total)
  let o = 0
  for (const p of partes) {
    out.set(p, o)
    o += p.length
  }
  return out
}

/** Data e hora no formato do MS-DOS, que é o que o ZIP guarda. */
function dataDos(d: Date) {
  const hora = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)
  const data = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  return { hora, data }
}

interface Entrada {
  nome: string
  chave: string
}

/**
 * Constrói o ZIP à medida que envia.
 *
 * Um ficheiro que falhe a ler é saltado e não interrompe o resto: numa entrega
 * de mil fotografias, perder o download inteiro por causa de uma é pior do que
 * entregar 999 e dizer quais faltaram.
 */
function zipStream(entradas: Entrada[], bucket: R2Bucket): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controlador) {
      const central: Uint8Array[] = []
      let deslocamento = 0
      let contados = 0
      const codificador = new TextEncoder()

      for (const entrada of entradas) {
        const objecto = await bucket.get(entrada.chave)
        if (!objecto) continue

        const nome = codificador.encode(entrada.nome)
        const { hora, data } = dataDos(objecto.uploaded ?? new Date())
        const inicio = deslocamento

        // Cabeçalho local. Tamanho e CRC vão a zero e seguem no descritor: é
        // esse o truque que permite escrever antes de ler o ficheiro.
        const cabecalho = juntar(
          u32(0x04034b50),
          u16(20),
          /*
            0x08 é o descritor de dados a seguir; 0x800 diz que o nome do
            ficheiro vem em UTF-8.

            Sem o 0x800, o ZIP declara os nomes em CP437 e qualquer acento sai
            corrompido ao extrair: "coração" vira "cora├º├úo". Apanhado a
            extrair o ficheiro com uma ferramenta independente, não a olhar
            para o código.
          */
          u16(0x08 | 0x800),
          u16(0), // sem compressão
          u16(hora),
          u16(data),
          u32(0),
          u32(0),
          u32(0),
          u16(nome.length),
          u16(0),
          nome,
        )
        controlador.enqueue(cabecalho)
        deslocamento += cabecalho.length

        const crc = new Crc32()
        let tamanho = 0
        const leitor = objecto.body!.getReader()
        for (;;) {
          const { done, value } = await leitor.read()
          if (done) break
          crc.atualiza(value)
          tamanho += value.length
          controlador.enqueue(value)
        }
        deslocamento += tamanho

        const descritor = juntar(u32(0x08074b50), u32(crc.valor), u32(tamanho), u32(tamanho))
        controlador.enqueue(descritor)
        deslocamento += descritor.length

        central.push(
          juntar(
            u32(0x02014b50),
            u16(20),
            u16(20),
            u16(0x08 | 0x800),
            u16(0),
            u16(hora),
            u16(data),
            u32(crc.valor),
            u32(tamanho),
            u32(tamanho),
            u16(nome.length),
            u16(0),
            u16(0),
            u16(0),
            u16(0),
            u32(0),
            u32(inicio),
            nome,
          ),
        )
        contados++
      }

      const dir = juntar(...central)
      controlador.enqueue(dir)
      controlador.enqueue(
        juntar(
          u32(0x06054b50),
          u16(0),
          u16(0),
          u16(contados),
          u16(contados),
          u32(dir.length),
          u32(deslocamento),
          u16(0),
        ),
      )
      controlador.close()
    },
  })
}

/**
 * Compara dois segredos sem deixar o tempo dizer quantos caracteres batem.
 *
 * Percorre sempre o comprimento todo e acumula as diferenças, em vez de parar
 * na primeira. O comprimento em si não é segredo (é sempre o mesmo), por isso
 * pode sair pela porta rápida.
 */
function igualEmTempoConstante(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0) return false
  let diferenca = 0
  for (let i = 0; i < a.length; i++) diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diferenca === 0
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    const slug = url.searchParams.get('e')
    const token = url.searchParams.get('t') ?? ''
    if (!slug) return new Response('falta o evento', { status: 400 })

    // A lista vem do Supabase, com a service role: é lá que estão as regras de
    // quem pode ver o quê, e o Worker não as reimplementa.
    const res = await fetch(
      `${env.SUPABASE_URL}/rest/v1/events?slug=eq.${encodeURIComponent(slug)}&select=id,couple_name,download_token`,
      {
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      },
    )
    const eventos = (await res.json()) as
      { id: string; couple_name: string; download_token: string }[]
    const evento = eventos?.[0]
    if (!evento) return new Response('não encontrado', { status: 404 })

    /*
      O slug sozinho não chega. Ele está impresso nas mesas para os convidados
      o lerem, e é isso que o torna imprestável como autorização: quem foi
      convidado para deixar fotografias não foi convidado para levar as de toda
      a gente. O segredo do download vive na base de dados e só aparece no
      painel.

      A comparação é feita em tempo constante. Uma comparação normal desiste no
      primeiro carácter diferente, e o tempo que demora a desistir diz quantos
      caracteres estavam certos, o que permite descobrir o segredo à letra.
    */
    if (!igualEmTempoConstante(token, evento.download_token)) {
      // A mesma resposta que se dá a um evento que não existe: sem token, não
      // se confirma sequer que este casamento é real.
      return new Response('não encontrado', { status: 404 })
    }

    const mres = await fetch(
      `${env.SUPABASE_URL}/rest/v1/event_media?event_id=eq.${evento.id}&status=eq.aprovado&select=storage_key,original_name&order=created_at.asc`,
      {
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      },
    )
    const linhas = (await mres.json()) as { storage_key: string; original_name: string | null }[]
    if (!linhas?.length) return new Response('sem fotografias', { status: 404 })

    /*
      Nomes repetidos dentro de um ZIP silenciam ficheiros: o segundo substitui
      o primeiro ao extrair, sem aviso. Numa recolha em que trezentos telemóveis
      geram IMG_0001.jpg, isto não é um caso raro, é o caso normal.
    */
    const usados = new Set<string>()
    const entradas: Entrada[] = linhas.map((l) => {
      /*
        O nome original, e não a chave no bucket. A chave leva um carimbo
        temporal à frente para não haver colisões no armazenamento, e entregar
        "1757954-a3f9-IMG_0042.jpg" a um casal é entregar-lhe a nossa
        arrumação interna em vez das fotografias dele.
      */
      let nome = l.original_name || l.storage_key.split('/').pop() || 'ficheiro'
      if (usados.has(nome)) {
        const p = nome.lastIndexOf('.')
        const base = p > 0 ? nome.slice(0, p) : nome
        const ext = p > 0 ? nome.slice(p) : ''
        let n = 2
        while (usados.has(`${base}-${n}${ext}`)) n++
        nome = `${base}-${n}${ext}`
      }
      usados.add(nome)
      return { nome, chave: l.storage_key }
    })

    const ficheiro = `${slug}.zip`
    return new Response(zipStream(entradas, env.BUCKET), {
      headers: {
        'content-type': 'application/zip',
        'content-disposition': `attachment; filename="${ficheiro}"`,
        // Sem `content-length`: não se sabe o total antes de o construir, e é
        // esse desconhecimento que permite começar a enviar de imediato.
        'cache-control': 'no-store',
      },
    })
  },
}
