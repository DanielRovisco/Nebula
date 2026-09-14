// Edge Function: a mostra da estação de impressão, vista pelo convidado.
//
//   { slug, depois?, limite? }
//     → { name, eventDate, expiresAt, fotos: [...], proximo }
//       Por ordem crescente de número, às páginas. `depois` é o número da última
//       que já se tem: pede as seguintes a essa.
//
// Deploy: supabase functions deploy print-gallery --no-verify-jwt
// (sem verificação de JWT de propósito: quem abre isto é um convidado sem
// conta, a partir de um código QR em cima de uma mesa)
//
// ─────────────────────────────────────────────────────────────────────────────
// Duas coisas vivem aqui e em mais lado nenhum, e é por isso que esta função
// existe em vez de o browser falar com a base de dados.
//
// A primeira é a hora de fim. Depois dela não sai lista nem sai URL, e é uma
// decisão tomada com o relógio do servidor. Fosse do lado do browser e bastava
// mudar a hora do telemóvel.
//
// A segunda é o acesso às imagens. O bucket é privado: não há endereço público
// para nenhuma destas fotografias. O que sai daqui são URLs assinados de
// validade curta, e quando a mostra acabar os que andarem por aí morrem
// sozinhos. Não há link que sobreviva ao casamento.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { cors, json, presign } from '../_shared/r2.ts'

/*
  Duas horas, como no resto do sistema.

  É o que dura uma estação de impressão, e é curto o suficiente para um URL
  copiado do inspector não valer nada no dia seguinte.
*/
const VER_TTL = 60 * 60 * 2

/*
  Quarenta e oito por página.

  A rede de um casamento é duzentas pessoas no mesmo ponto de acesso a partilhar
  a ligação da quinta. Mandar quatrocentos URLs assinados de uma vez são
  trezentos kilobytes de JSON antes de aparecer a primeira miniatura, e a página
  fica em branco o tempo todo. Às páginas, a primeira dúzia aparece em segundos.
*/
const POR_PAGINA = 48

const admin = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'bad_request' }, 400)
  }

  const slug = String(body.slug ?? '').toLowerCase().trim()
  if (!slug) return json({ error: 'sem_mostra' }, 400)

  const sb = admin()
  const { data: mostra } = await sb
    .from('print_galleries')
    .select('id, name, event_date, expires_at')
    .eq('slug', slug)
    .maybeSingle()

  // A mesma resposta para "não existe" e para "não é para ti": não se diz a
  // ninguém que mostras há, nem se deixa adivinhar slugs por tentativa.
  if (!mostra) return json({ error: 'nao_encontrado' }, 404)

  /*
    Fechada é `expires_at` preenchida e já passada. Nula é aberta, e fica aberta
    até alguém a fechar: nada aqui se fecha por relógio.

    Devolve-se o nome e mais nada: quem tem o link aberto desde ontem merece ler
    "isto terminou" em vez de um erro, mas não leva fotografia nenhuma, nem o
    número de quantas havia.
  */
  const fechada = mostra.expires_at
    ? new Date(mostra.expires_at as string).getTime() <= Date.now()
    : false
  if (fechada) {
    return json({ name: mostra.name, expiresAt: mostra.expires_at, terminada: true, fotos: [] })
  }

  const depois = Number(body.depois ?? 0)
  const limite = Math.min(Math.max(Number(body.limite ?? POR_PAGINA), 1), POR_PAGINA)

  /*
    Por ordem crescente, do 001 para a frente.

    É a ordem em que os ficheiros são numerados na mesa, e tem de ser a mesma nos
    dois sítios: quem está a carregar vê a lista a crescer pelo fim, e quem
    procura a sua no telemóvel sabe que o 40 vem depois do 39. Uma ordem no
    painel e outra no telemóvel era garantir que alguém apontava para uma e
    pedia outra.
  */
  let q = sb
    .from('print_photos')
    .select('numero, storage_key, thumb_key, width, height')
    .eq('gallery_id', mostra.id)
    .order('numero', { ascending: true })
    .limit(limite + 1)
  if (depois > 0) q = q.gt('numero', depois)

  const { data: linhas, error } = await q
  if (error) return json({ error: 'erro' }, 500)

  const ha = (linhas ?? []).length > limite
  const pagina = (linhas ?? []).slice(0, limite)

  /*
    Assinar é cálculo local, não é ida ao R2: quarenta e oito pares saem em
    milissegundos. Vão os dois URLs de cada vez porque abrir uma fotografia em
    ecrã cheio não pode custar outra ida ao servidor a meio de uma festa.
  */
  const fotos = await Promise.all(
    pagina.map(async (f) => ({
      numero: f.numero,
      thumbUrl: await presign(String(f.thumb_key), 'GET', VER_TTL),
      url: await presign(String(f.storage_key), 'GET', VER_TTL),
      width: f.width,
      height: f.height,
    })),
  )

  return json({
    name: mostra.name,
    eventDate: mostra.event_date,
    expiresAt: mostra.expires_at,
    terminada: false,
    fotos,
    // O número a pedir a seguir, ou nulo quando já não há mais nada à frente.
    proximo: ha && pagina.length ? pagina[pagina.length - 1].numero : null,
  })
})
