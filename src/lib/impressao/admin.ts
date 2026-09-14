/**
 * O lado da mesa: criar mostras, carregar fotografias, acompanhar e apagar.
 *
 * Fala com o Supabase directamente, como o resto do painel: as políticas RLS
 * amarram as duas tabelas ao dono, e um pedido sem sessão não vê linha nenhuma.
 * A regra vive na base de dados, onde não depende de o browser se portar bem.
 */
import { supabase } from '../gallery/config'
import { callAdmin, putToR2 } from '../gallery/api'
import { prepararFoto } from './processar'

export interface Mostra {
  id: string
  slug: string
  name: string
  event_date: string | null
  /** Quando foi fechada. Nulo é aberta, e fica aberta até alguém a fechar. */
  expires_at: string | null
  next_number: number
  created_at: string
}

export interface FotoMostra {
  id: string
  numero: number
  storage_key: string
  thumb_key: string
  width: number | null
  height: number | null
  size_bytes: number
  created_at: string
  /** Preenchido depois, por `assinarMiniaturas`. */
  thumbUrl?: string
}

/** Aberta é `expires_at` por preencher, ou ainda no futuro. */
export const estaAberta = (m: Pick<Mostra, 'expires_at'>) =>
  !m.expires_at || new Date(m.expires_at).getTime() > Date.now()

export const slugificar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, '-e-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

export async function listarMostras(): Promise<Mostra[]> {
  const { data, error } = await supabase()
    .from('print_galleries')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Mostra[]
}

export async function lerMostra(id: string): Promise<Mostra> {
  const { data, error } = await supabase()
    .from('print_galleries')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data as Mostra
}

export async function criarMostra(dados: {
  name: string
  slug: string
  eventDate: string | null
}): Promise<Mostra> {
  const sb = supabase()
  const { data: sessao } = await sb.auth.getUser()
  if (!sessao.user) throw new Error('Sessão expirada. Volta a entrar.')

  const { data, error } = await sb
    .from('print_galleries')
    .insert({
      slug: dados.slug,
      name: dados.name,
      event_date: dados.eventDate,
      // Nasce aberta e sem hora para fechar. Fecha quando alguém a fechar.
      expires_at: null,
      owner_id: sessao.user.id,
    })
    .select()
    .single()
  if (error) {
    // 23505: o slug já existe. Duas mostras com o mesmo endereço seriam dois
    // códigos QR a levar ao mesmo sítio, e não há como desfazer depois de
    // impressos.
    if (error.code === '23505') throw new Error('Já existe uma mostra com este endereço.')
    throw new Error(error.message)
  }
  return data as Mostra
}

export async function listarFotos(galeriaId: string): Promise<FotoMostra[]> {
  const { data, error } = await supabase()
    .from('print_photos')
    .select('*')
    .eq('gallery_id', galeriaId)
    .order('numero', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as FotoMostra[]
}

/**
 * Abre ou fecha a mostra. É a única coisa que se pode mudar depois de criada.
 *
 * Fechar é marcar a hora; abrir é apagá-la. Guardado como instante e não como
 * um sim ou não porque assim a mostra sabe quando fechou, o que é a única coisa
 * que se quer saber sobre ela depois da festa.
 */
async function marcarFim(id: string, quando: Date | null): Promise<void> {
  const { error } = await supabase()
    .from('print_galleries')
    .update({ expires_at: quando ? quando.toISOString() : null })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

/** Fecha já. Os telemóveis deixam de ver, e os URLs por aí morrem sozinhos. */
export const fechar = (id: string) => marcarFim(id, new Date())

/** Volta a abrir, com o mesmo endereço e os mesmos números. */
export const reabrir = (id: string) => marcarFim(id, null)

/**
 * Miniaturas para o painel ver o que já entrou.
 *
 * Às centenas de cada vez, e não uma a uma: são centenas de assinaturas num
 * pedido só, e o painel de uma mesa de impressão é recarregado muitas vezes ao
 * longo de uma noite.
 */
export async function assinarMiniaturas(fotos: FotoMostra[]): Promise<FotoMostra[]> {
  if (!fotos.length) return fotos
  const lotes: FotoMostra[][] = []
  for (let i = 0; i < fotos.length; i += 500) lotes.push(fotos.slice(i, i + 500))

  const assinados: FotoMostra[] = []
  for (const lote of lotes) {
    const { urls } = await callAdmin<{ urls: string[] }>({
      action: 'read-urls',
      keys: lote.map((f) => f.thumb_key),
    })
    lote.forEach((f, i) => assinados.push({ ...f, thumbUrl: urls[i] }))
  }
  return assinados
}

export interface ResultadoCarregar {
  entraram: number
  falharam: { nome: string; porque: string }[]
}

/**
 * Carrega fotografias para a mostra, uma a uma, pela ordem em que vieram.
 *
 * Uma a uma e não todas ao mesmo tempo, e é uma decisão e não uma falta de
 * ambição: cada fotografia é descodificada e redesenhada duas vezes num canvas,
 * e fazer isso a dez em paralelo põe o portátil de joelhos a meio de um
 * casamento. A sério: já vi acontecer com menos.
 *
 * O número é pedido à base de dados imediatamente antes de subir cada uma, e é
 * ela que o atribui de forma atómica. Calcular números do lado do browser, com
 * dois portáteis a carregar para a mesma mostra, dá duas fotografias com o
 * mesmo número e um convidado a receber a fotografia de outra pessoa.
 */
export async function carregarFotos(
  galeriaId: string,
  ficheiros: File[],
  aoAvancar: (feitas: number, total: number) => void,
): Promise<ResultadoCarregar> {
  const sb = supabase()
  const falharam: { nome: string; porque: string }[] = []
  let entraram = 0

  for (const ficheiro of ficheiros) {
    try {
      if (!ficheiro.type.startsWith('image/')) throw new Error('Não é uma fotografia.')

      const { data: numero, error: erroNum } = await sb.rpc('mostra_proximo_numero', {
        p_gallery: galeriaId,
      })
      if (erroNum || typeof numero !== 'number') {
        throw new Error(erroNum?.message ?? 'Não consegui atribuir o número.')
      }

      const pronta = await prepararFoto(ficheiro, numero)

      const subir = async (blob: Blob, kind: 'full' | 'thumb') => {
        const { key, url } = await callAdmin<{ key: string; url: string }>({
          action: 'upload-url',
          galleryId: galeriaId,
          fileName: `${String(numero).padStart(4, '0')}.webp`,
          contentType: 'image/webp',
          kind,
        })
        await putToR2(url, blob, 'image/webp')
        return key
      }

      const chaveVer = await subir(pronta.ver, 'full')
      const chaveThumb = await subir(pronta.thumb, 'thumb')

      const { error } = await sb.from('print_photos').insert({
        gallery_id: galeriaId,
        numero,
        storage_key: chaveVer,
        thumb_key: chaveThumb,
        width: pronta.width,
        height: pronta.height,
        size_bytes: pronta.ver.size + pronta.thumb.size,
      })
      if (error) {
        /*
          A linha não entrou: os dois objetos ficariam no R2 sem ninguém que os
          consiga ver nem apagar pela interface. Limpa-se já.

          O número fica queimado, e fica bem: é preferível um buraco na
          sequência a um número usado duas vezes.
        */
        await callAdmin({ action: 'delete', keys: [chaveVer, chaveThumb] }).catch(() => {})
        throw new Error(error.message)
      }
      entraram++
    } catch (e) {
      falharam.push({ nome: ficheiro.name, porque: (e as Error).message })
    }
    aoAvancar(entraram + falharam.length, ficheiros.length)
  }

  return { entraram, falharam }
}

/** Apaga uma fotografia da mostra. O número dela não volta a ser usado. */
export async function apagarFoto(foto: FotoMostra): Promise<void> {
  await callAdmin({ action: 'delete', keys: [foto.storage_key, foto.thumb_key] }).catch(() => {})
  const { error } = await supabase().from('print_photos').delete().eq('id', foto.id)
  if (error) throw new Error(error.message)
}

/**
 * Apaga a mostra e tudo o que ela tem no R2.
 *
 * Os objetos primeiro e a linha depois, e não ao contrário: apagada a linha,
 * as chaves deixam de ser conhecidas por alguém e os ficheiros ficavam a ocupar
 * espaço para sempre, sem interface nenhuma que lhes chegue.
 */
export async function apagarMostra(id: string): Promise<void> {
  const fotos = await listarFotos(id)
  const chaves = fotos.flatMap((f) => [f.storage_key, f.thumb_key])
  if (chaves.length) {
    for (let i = 0; i < chaves.length; i += 500) {
      await callAdmin({ action: 'delete', keys: chaves.slice(i, i + 500) }).catch(() => {})
    }
  }
  const { error } = await supabase().from('print_galleries').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
