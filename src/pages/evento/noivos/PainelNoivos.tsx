import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import {
  Check, Download, EyeOff, Image as ImagemIcone, Loader2, Play, Trash2, Undo2, Users,
} from 'lucide-react'
import Seo from '../../../lib/Seo'
import Reveal from '../../../lib/Reveal'
import CountUp from '../../../lib/CountUp'
import { asset } from '../../../lib/asset'
import { CONTACT, absoluteUrl } from '../../../lib/site'
import {
  type EstadoMedia, type MediaNoivos, type Painel,
  SemAcesso, apagarMedia, esquecerChave, guardarChave, guardarDefinicoes,
  lerChave, lerPainel, mudarEstado, purgarMedia, restaurarMedia,
} from '../../../lib/evento/noivos'
import Codigo from './Codigo'
import Foto from './Foto'

const ZIP = import.meta.env.VITE_ZIP_WORKER_URL as string | undefined

/** Leitura do relógio, fora dos componentes: não é estado do React. */
const aindaAberto = (iso: string) => new Date(iso).getTime() > Date.now()

type Aba = 'todas' | 'pendente' | 'escondido' | 'lixo'

/**
 * O painel dos noivos.
 *
 * A diferença entre isto e o painel do fotógrafo não é de funcionalidades, é de
 * quem está do outro lado. O fotógrafo abre o painel dele dez vezes por semana
 * e quer densidade; um casal abre isto talvez cinco vezes na vida, e duas delas
 * a chorar. Por isso aqui há espaço, os números são grandes, as fotografias
 * mandam, e as acções perigosas estão ao alcance mas não ao caminho.
 *
 * Não há conta nem palavra-passe: a chave vem no link que o fotógrafo entregou
 * e fica guardada no browser, para eles poderem pôr a página nos favoritos sem
 * o segredo ficar à vista na barra de endereço.
 */
export default function PainelNoivos() {
  const { slug = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const reduzido = useReducedMotion()

  const [chave] = useState<string | null>(() => params.get('k') ?? lerChave(slug))
  const [painel, setPainel] = useState<Painel | null>(null)
  const [erro, setErro] = useState<'sem_acesso' | 'falhou' | null>(null)

  const [aba, setAba] = useState<Aba>('todas')
  const [escolhidos, setEscolhidos] = useState<Set<string>>(new Set())
  const [aberto, setAberto] = useState<number | null>(null)
  const [ocupado, setOcupado] = useState(false)

  /*
    A chave sai do endereço assim que é guardada. Fica no browser e a barra
    volta a mostrar só o endereço do casamento — que é o que eles vão ver
    quando alguém estiver a espreitar por cima do ombro, e o que fica no
    histórico do telemóvel.
  */
  useEffect(() => {
    const noEndereco = params.get('k')
    if (!noEndereco) return
    // A chave já entrou no estado no arranque, a partir deste mesmo endereço.
    // Aqui só se guarda e se limpa a barra — não há estado novo a pôr.
    guardarChave(slug, noEndereco)
    const limpo = new URLSearchParams(params)
    limpo.delete('k')
    setParams(limpo, { replace: true })
  }, [params, setParams, slug])

  useEffect(() => {
    if (!chave) return
    let vivo = true
    lerPainel(slug, chave)
      .then((p) => {
        if (!vivo) return
        setPainel(p)
        setErro(null)
      })
      .catch((e) => {
        if (!vivo) return
        if (e instanceof SemAcesso) {
          esquecerChave(slug)
          setErro('sem_acesso')
        } else {
          setErro('falhou')
        }
      })
    return () => { vivo = false }
  }, [chave, slug])

  // Uma lista nova a cada render fazia o useMemo abaixo recalcular sempre, e
  // o `??` sozinho produz exactamente isso quando o painel ainda não chegou.
  const media = useMemo(() => painel?.media ?? [], [painel])

  const daAba = useCallback(
    (qual: Aba) =>
      qual === 'lixo'
        ? media.filter((m) => m.apagada)
        // "Na galeria" é mesmo o que está na galeria. Incluir aqui o que está à
        // espera de aprovação era contradizer a etiqueta e, pior, dar a
        // entender que os convidados já viam uma fotografia por aprovar.
        : media.filter((m) => !m.apagada && m.status === (qual === 'todas' ? 'aprovado' : qual)),
    [media],
  )

  /*
    Os separadores laterais só existem enquanto tiverem alguma coisa, e o que
    lá está pode ser esvaziado por uma acção do próprio: recuperar a última
    fotografia do lixo faz o separador "Lixo" desaparecer.

    Sem isto, quem o fizesse ficava preso num separador que já não está na
    navegação, a olhar para uma grelha vazia sem forma óbvia de sair. Deriva-se
    em vez de se corrigir num efeito: assim nunca chega a haver um render com o
    separador errado.
  */
  const abaEfectiva: Aba = aba !== 'todas' && daAba(aba).length === 0 ? 'todas' : aba
  const visiveis = useMemo(() => daAba(abaEfectiva), [daAba, abaEfectiva])

  const contar = (s: EstadoMedia) => media.filter((m) => !m.apagada && m.status === s).length
  const noLixo = media.filter((m) => m.apagada).length

  /** Aplica uma mudança localmente e no servidor, sem esperar por uma recarga. */
  const aplicar = async (ids: string[], accao: (k: string) => Promise<unknown>, local: (m: MediaNoivos[]) => MediaNoivos[]) => {
    if (!chave || !painel || !ids.length) return
    setOcupado(true)
    const antes = painel.media
    setPainel({ ...painel, media: local(antes) })
    setEscolhidos(new Set())
    try {
      await accao(chave)
    } catch {
      // Repor o que estava: uma grelha que mostra o resultado de uma acção que
      // falhou é pior do que uma que não muda nada.
      setPainel((p) => (p ? { ...p, media: antes } : p))
      setErro('falhou')
    } finally {
      setOcupado(false)
    }
  }

  const mudar = (ids: string[], status: EstadoMedia) =>
    aplicar(
      ids,
      (k) => mudarEstado(slug, k, ids, status),
      (m) => m.map((x) => (ids.includes(x.id) ? { ...x, status } : x)),
    )

  /*
    Apagar manda para o lixo, e por isso não pergunta nada: é reversível, está
    à distância de um separador, e uma pergunta antes de cada gesto reversível
    ensina as pessoas a carregar em "sim" sem ler — que é exactamente o hábito
    que não se quer quando aparecer a pergunta que conta.
  */
  const apagar = (ids: string[]) =>
    aplicar(
      ids,
      (k) => apagarMedia(slug, k, ids),
      (m) => m.map((x) => (ids.includes(x.id) ? { ...x, apagada: true } : x)),
    )

  const restaurar = (ids: string[]) =>
    aplicar(
      ids,
      (k) => restaurarMedia(slug, k, ids),
      (m) => m.map((x) => (ids.includes(x.id) ? { ...x, apagada: false } : x)),
    )

  /* Esta é a que conta, e é a única que pergunta. */
  const purgar = (ids: string[]) => {
    if (!confirm(
      ids.length === 1
        ? 'Apagar esta fotografia definitivamente? Não há como a trazer de volta.'
        : `Apagar ${ids.length} ficheiros definitivamente? Não há como os trazer de volta.`,
    )) return
    return aplicar(
      ids,
      (k) => purgarMedia(slug, k, ids),
      (m) => m.filter((x) => !ids.includes(x.id)),
    )
  }

  const definir = async (campos: Parameters<typeof guardarDefinicoes>[2]) => {
    if (!chave || !painel) return
    /*
      Os interruptores mudam à frente dos olhos, antes de o servidor responder:
      esperar por ele fazia o botão parecer partido numa rede fraca.

      A frase fica de fora dessa antecipação, porque é o único campo que o
      servidor pode devolver diferente do que recebeu (vazia vira a de sempre).
      Adivinhá-la aqui era arriscar mostrar uma coisa e ter outra gravada.
    */
    const local: Partial<Painel['evento']> = {}
    if (typeof campos.guestsSeeGallery === 'boolean') local.guestsSeeGallery = campos.guestsSeeGallery
    if (typeof campos.moderation === 'boolean') local.moderation = campos.moderation
    if (campos.revealAt !== undefined) local.revealAt = campos.revealAt
    setPainel({ ...painel, evento: { ...painel.evento, ...local } })
    try {
      await guardarDefinicoes(slug, chave, campos)
    } catch { setErro('falhou') }
  }

  if (!chave || erro === 'sem_acesso') return <Portao comChave={Boolean(chave)} />
  if (!painel) return <AEsperar erro={erro === 'falhou'} />

  const { evento, pessoas } = painel
  const fotos = media.filter((m) => m.kind === 'foto').length
  const videos = media.filter((m) => m.kind === 'video').length

  return (
    <div className="min-h-screen pb-28">
      <Seo title={`${evento.coupleName} · O vosso casamento`} description="As fotografias do vosso casamento." noindex />

      <Capa nome={evento.coupleName} data={evento.eventDate} reduzido={Boolean(reduzido)} />

      <main className="container-px max-w-5xl mx-auto">
        <Reveal>
          <section className="grid grid-cols-3 gap-px bg-white/[0.07] rounded-2xl overflow-hidden -mt-6 sm:-mt-10 relative">
            <Numero valor={fotos} rotulo={fotos === 1 ? 'foto' : 'fotos'} icone={<ImagemIcone size={14} />} />
            <Numero valor={videos} rotulo={videos === 1 ? 'vídeo' : 'vídeos'} icone={<Play size={14} />} />
            <Numero valor={pessoas} rotulo={pessoas === 1 ? 'pessoa' : 'pessoas'} icone={<Users size={14} />} />
          </section>
        </Reveal>

        <Reveal delay={0.1}>
          <section className="mt-16 sm:mt-24 p-6 sm:p-8 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
            <Codigo url={absoluteUrl(`e/${evento.slug}`)} nome={evento.coupleName} />
          </section>
        </Reveal>

        <section className="mt-16 sm:mt-24">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="label-sm">A vossa galeria</span>
                <h2 className="font-serif text-3xl sm:text-4xl mt-2 leading-tight">
                  {media.length === 0
                    ? 'Ainda vazia'
                    : media.length === 1 ? 'Um momento' : `${media.length} momentos`}
                </h2>
              </div>
              {ZIP && media.length > 0 && (
                <a
                  href={`${ZIP}?e=${encodeURIComponent(evento.slug)}&t=${encodeURIComponent(chave)}`}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-titanium text-eerie text-[11px] uppercase tracking-[0.12em] hover:bg-titanium/90 transition-colors min-h-[44px]"
                >
                  <Download size={14} /> Descarregar tudo
                </a>
              )}
            </div>
          </Reveal>

          {media.length === 0 ? (
            <p className="text-titanium/40 leading-relaxed mt-6 max-w-md">
              Assim que alguém ler o código e mandar a primeira fotografia, ela
              aparece aqui. Não é preciso fazer nada até lá.
            </p>
          ) : (
            <>
              <Abas
                aba={abaEfectiva}
                aoMudar={(a) => { setAba(a); setEscolhidos(new Set()) }}
                naGaleria={contar('aprovado')}
                pendentes={contar('pendente')}
                escondidas={contar('escondido')}
                noLixo={noLixo}
              />

              {abaEfectiva === 'lixo' && (
                <p className="mt-5 text-sm text-titanium/45 leading-relaxed max-w-lg">
                  O que foi apagado, por vocês ou por quem o enviou. Nada aqui
                  desaparece sozinho: fica à vossa espera até decidirem. Escolham
                  e recuperem, ou apaguem de vez.
                </p>
              )}

              <Grelha
                itens={visiveis}
                escolhidos={escolhidos}
                aoEscolher={(id) => {
                  const s = new Set(escolhidos)
                  if (s.has(id)) s.delete(id)
                  else s.add(id)
                  setEscolhidos(s)
                }}
                aoAbrir={setAberto}
                haEscolha={escolhidos.size > 0}
              />
            </>
          )}
        </section>

        <Reveal>
          <Definicoes evento={evento} aoMudar={definir} />
        </Reveal>
      </main>

      {escolhidos.size > 0 && (
        <BarraEscolha
          quantos={escolhidos.size}
          ocupado={ocupado}
          aba={abaEfectiva}
          aoLimpar={() => setEscolhidos(new Set())}
          aoAprovar={() => mudar([...escolhidos], 'aprovado')}
          aoEsconder={() => mudar([...escolhidos], 'escondido')}
          aoApagar={() => apagar([...escolhidos])}
          aoRestaurar={() => restaurar([...escolhidos])}
          aoPurgar={() => purgar([...escolhidos])}
        />
      )}

      {aberto !== null && visiveis[aberto] && (
        <Foto
          item={visiveis[aberto]}
          indice={aberto}
          total={visiveis.length}
          aoFechar={() => setAberto(null)}
          aoAnterior={() => setAberto((i) => ((i ?? 0) - 1 + visiveis.length) % visiveis.length)}
          aoSeguinte={() => setAberto((i) => ((i ?? 0) + 1) % visiveis.length)}
          noLixo={abaEfectiva === 'lixo'}
          aoEsconder={() => {
            const alvo = visiveis[aberto]
            if (abaEfectiva === 'lixo') restaurar([alvo.id])
            else mudar([alvo.id], alvo.status === 'escondido' ? 'aprovado' : 'escondido')
            setAberto(null)
          }}
          aoApagar={() => {
            const alvo = visiveis[aberto]
            setAberto(null)
            if (abaEfectiva === 'lixo') purgar([alvo.id])
            else apagar([alvo.id])
          }}
        />
      )}
    </div>
  )
}

/* ── partes ──────────────────────────────────────────────────────────────── */

/**
 * A abertura: os nomes, a data, e nada mais.
 *
 * O logótipo é pequeno e fica em cima; os nomes é que mandam. É a página deles,
 * não a nossa — a assinatura chega ao fundo.
 */
function Capa({ nome, data, reduzido }: { nome: string; data: string; reduzido: boolean }) {
  const alvo = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: alvo, offset: ['start start', 'end start'] })
  const desvanecer = useTransform(scrollYProgress, [0, 1], [1, 0])

  const formatada = new Date(data).toLocaleDateString('pt-PT', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div ref={alvo} className="relative min-h-[62svh] sm:min-h-[70svh] flex items-center justify-center overflow-hidden">
      {/* Um halo muito ténue atrás do texto, para os nomes não flutuarem sobre
          o nada. Não é uma fotografia porque não há nenhuma que sirva a todos
          os casamentos, e a errada seria pior do que nenhuma. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(closest-side at 50% 42%, rgba(252,255,240,0.055), rgba(252,255,240,0) 72%)',
        }}
      />

      <motion.div
        style={reduzido ? undefined : { opacity: desvanecer }}
        className="relative text-center container-px"
      >
        <motion.img
          src={asset('brand/logo-symbol-white.png')}
          alt=""
          aria-hidden
          width={1252}
          height={1494}
          initial={reduzido ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 0.55, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="h-12 sm:h-14 w-auto mx-auto mb-9"
        />

        <div className="overflow-hidden">
          <motion.h1
            initial={reduzido ? false : { y: '110%' }}
            animate={{ y: 0 }}
            transition={{ duration: 1.15, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="font-serif leading-[1.05]"
            style={{ fontSize: 'clamp(2.5rem, 9vw, 5.5rem)' }}
          >
            {nome}
          </motion.h1>
        </div>

        <motion.p
          initial={reduzido ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="label-sm mt-7"
        >
          {formatada}
        </motion.p>
      </motion.div>
    </div>
  )
}

function Numero({
  valor, rotulo, icone,
}: { valor: number; rotulo: string; icone?: React.ReactNode }) {
  return (
    <div className="bg-eerie px-3 sm:px-4 py-6 sm:py-7 text-center">
      {icone && <span className="inline-flex text-titanium/25 mb-2">{icone}</span>}
      {/*
        O número sobe de zero até ao valor quando entra no ecrã. Com movimento
        reduzido ligado no sistema, aparece logo o valor final: um número a
        saltar é movimento como qualquer outro.
      */}
      {/*
        O `font-serif` tem de ir também aos filhos: há uma regra base que dá
        Montserrat a todos os `span`, e o CountUp põe o número dentro de um. A
        regra atinge esse span directamente e ganha ao tipo de letra herdado do
        pai, por isso herdar não chega aqui.
      */}
      <CountUp
        to={valor}
        className="block font-serif [&_span]:font-serif text-3xl sm:text-4xl leading-none"
      />
      {/*
        Menos espacejamento no telemóvel. Com três colunas a 390px, cada célula
        tem uns 120px, e o `label-sm` a 0.28em fazia "fotografias" transbordar
        para cima da vizinha. Encurtou-se a palavra e aliviou-se o espacejamento
        só onde é preciso.
      */}
      <p className="label-sm mt-2.5 tracking-[0.16em] sm:tracking-[0.28em]">{rotulo}</p>
    </div>
  )
}

function Abas({
  aba, aoMudar, naGaleria, pendentes, escondidas, noLixo,
}: {
  aba: Aba
  aoMudar: (a: Aba) => void
  naGaleria: number
  pendentes: number
  escondidas: number
  noLixo: number
}) {
  // As abas vazias não aparecem. Um casamento sem moderação nunca tem nada à
  // espera, e mostrar um separador permanentemente a zero era dar uma tarefa
  // que não existe.
  const lista: [Aba, string, number][] = [
    ['todas', 'Na galeria', naGaleria],
    ...(pendentes > 0 ? [['pendente', 'À espera', pendentes] as [Aba, string, number]] : []),
    ...(escondidas > 0 ? [['escondido', 'Escondidas', escondidas] as [Aba, string, number]] : []),
    ...(noLixo > 0 ? [['lixo', 'Lixo', noLixo] as [Aba, string, number]] : []),
  ]
  if (lista.length === 1) return null

  return (
    <nav className="flex gap-1 border-b border-white/[0.08] mt-8">
      {lista.map(([chave, etiqueta, conta]) => (
        <button
          key={chave}
          onClick={() => aoMudar(chave)}
          className={`px-4 py-3 text-[11px] uppercase tracking-[0.18em] border-b-2 -mb-px transition-colors ${
            aba === chave
              ? 'border-titanium text-titanium'
              : 'border-transparent text-titanium/40 hover:text-titanium/70'
          }`}
        >
          {etiqueta} <span className="text-titanium/30">{conta}</span>
        </button>
      ))}
    </nav>
  )
}

/**
 * A grelha.
 *
 * Um clique abre a fotografia; a escolha múltipla só entra em cena depois de se
 * usar o canto de selecção. É a ordem certa para quem vem ver as fotografias do
 * seu casamento: abrir é o que se quer fazer noventa e nove vezes em cem, e
 * seria estranho que o gesto normal servisse para arrumar.
 */
function Grelha({
  itens, escolhidos, aoEscolher, aoAbrir, haEscolha,
}: {
  itens: MediaNoivos[]
  escolhidos: Set<string>
  aoEscolher: (id: string) => void
  aoAbrir: (i: number) => void
  haEscolha: boolean
}) {
  if (itens.length === 0) {
    return <p className="text-titanium/35 text-sm mt-8">Nada aqui.</p>
  }

  return (
    <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-2">
      {itens.map((m, i) => {
        const escolhido = escolhidos.has(m.id)
        return (
          <div key={m.id} className="relative group">
            <button
              onClick={() => (haEscolha ? aoEscolher(m.id) : aoAbrir(i))}
              className={`block w-full aspect-square rounded-lg overflow-hidden bg-white/[0.04] transition-all duration-300 ${
                escolhido ? 'ring-2 ring-titanium ring-offset-2 ring-offset-eerie' : 'hover:opacity-85'
              }`}
            >
              {m.thumbUrl || m.kind === 'foto' ? (
                <img
                  src={m.thumbUrl ?? m.url}
                  alt={m.nome ?? 'Fotografia do casamento'}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-titanium/30">
                  <Play size={22} />
                </span>
              )}
            </button>

            {m.kind === 'video' && m.thumbUrl && (
              <span aria-hidden className="absolute top-2 left-2 text-titanium/80 drop-shadow">
                <Play size={14} />
              </span>
            )}

            {/* O canto de selecção: sempre presente para quem usa teclado,
                visível ao passar o rato ou quando já há uma escolha a decorrer. */}
            <button
              onClick={() => aoEscolher(m.id)}
              aria-label={escolhido ? 'Retirar da selecção' : 'Escolher'}
              aria-pressed={escolhido}
              className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                escolhido
                  ? 'bg-titanium text-eerie opacity-100'
                  : 'bg-eerie/60 text-titanium/70 opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
              } ${haEscolha ? 'opacity-100' : ''}`}
            >
              <Check size={14} />
            </button>

            {m.autor && (
              <span className="pointer-events-none absolute bottom-0 inset-x-0 px-2 py-1.5 text-[10px] truncate bg-gradient-to-t from-eerie/80 to-transparent text-titanium/75 rounded-b-lg">
                {m.autor}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function BarraEscolha({
  quantos, ocupado, aba, aoLimpar, aoAprovar, aoEsconder, aoApagar, aoRestaurar, aoPurgar,
}: {
  quantos: number
  ocupado: boolean
  aba: Aba
  aoLimpar: () => void
  aoAprovar: () => void
  aoEsconder: () => void
  aoApagar: () => void
  aoRestaurar: () => void
  aoPurgar: () => void
}) {
  const noLixo = aba === 'lixo'
  return (
    <div className="fixed bottom-4 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-50">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 rounded-2xl bg-eerie/95 backdrop-blur border border-white/15 shadow-2xl">
        <span className="text-sm text-titanium/70 mr-auto sm:mr-2 whitespace-nowrap">
          {quantos} {quantos === 1 ? 'escolhida' : 'escolhidas'}
        </span>
        {ocupado && <Loader2 size={14} className="animate-spin text-titanium/40" />}

        {noLixo ? (
          <>
            <button onClick={aoRestaurar} className={ACCAO}>
              <Undo2 size={13} /> Recuperar
            </button>
            {/* A única acção sem volta desta página. Vermelha, e sozinha. */}
            <button
              onClick={aoPurgar}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-red-500/15 hover:bg-red-500/25 text-red-200/85 transition-colors text-xs min-h-[40px]"
            >
              <Trash2 size={13} /> Apagar mesmo
            </button>
          </>
        ) : (
          <>
            {aba !== 'todas' && (
              <button onClick={aoAprovar} className={ACCAO}>
                <Check size={13} /> Pôr na galeria
              </button>
            )}
            {aba !== 'escondido' && (
              <button onClick={aoEsconder} className={ACCAO}>
                <EyeOff size={13} /> Esconder
              </button>
            )}
            <button onClick={aoApagar} className={ACCAO}>
              <Trash2 size={13} /> Apagar
            </button>
          </>
        )}

        <button onClick={aoLimpar} className="px-3 py-2 text-xs text-titanium/40 hover:text-titanium/80 transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  )
}

const ACCAO =
  'inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-white/[0.07] hover:bg-white/[0.14] transition-colors text-xs text-titanium/80 min-h-[40px]'

function Definicoes({
  evento, aoMudar,
}: {
  evento: Painel['evento']
  aoMudar: (campos: {
    guestsSeeGallery?: boolean
    moderation?: boolean
    welcomeMessage?: string | null
  }) => void
}) {
  const fecha = new Date(evento.uploadWindowEndsAt)
  const aberta = aindaAberto(evento.uploadWindowEndsAt)

  return (
    <section className="mt-16 sm:mt-24 pt-10 border-t border-white/[0.07]">
      <span className="label-sm">Definições</span>

      <Frase inicial={evento.welcomeMessage} aoGuardar={(v) => aoMudar({ welcomeMessage: v })} />

      <div className="mt-9 space-y-6 max-w-xl">
        <Interruptor
          ligado={evento.guestsSeeGallery}
          aoMudar={(v) => aoMudar({ guestsSeeGallery: v })}
          titulo="Galeria pública"
          nota="Os convidados podem ver as fotos todas. Desativado, só conseguem ver as que enviaram."
        />
        <Interruptor
          ligado={evento.moderation}
          aoMudar={(v) => aoMudar({ moderation: v })}
          titulo="Aprovar antes de aparecer"
          nota="Os noivos têm que aprovar as fotos que entram na galeria. Só é válido se a galeria for pública."
          /*
            Com a galeria fechada não há galeria para moderar: cada convidado vê
            o que enviou e nada mais. O interruptor fica esbatido em vez de
            desaparecer, para eles perceberem que a definição existe e porque é
            que ela não está a fazer nada.
          */
          esbatido={!evento.guestsSeeGallery}
        />
      </div>

      <p className="text-sm text-titanium/45 leading-relaxed mt-8 max-w-xl">
        {aberta ? (
          <>
            Os convidados podem mandar fotografias até{' '}
            <strong className="text-titanium/70 font-normal">
              {fecha.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}
            </strong>
            . Depois dessa data deixam de entrar novas, e nada é apagado: o que
            está aqui continua aqui.
          </>
        ) : (
          <>
            Os envios fecharam. Nada foi apagado, e nada vai ser: estas
            fotografias ficam. Se quiserem reabrir, é só dizer.
          </>
        )}
      </p>

      <p className="text-xs text-titanium/25 leading-relaxed mt-6 max-w-xl">
        Este link é a vossa chave. Quem o tiver vê e gere estas fotografias, por
        isso guardem-no como guardariam a chave de casa. Se alguma vez o
        perderem de vista, peçam-nos outro.
      </p>
    </section>
  )
}

/**
 * A frase que os convidados leem ao abrir o link.
 *
 * Guarda-se ao sair do campo e não a cada tecla: um pedido por letra escrita
 * era ruído para o servidor e, numa rede fraca, uma frase a chegar fora de
 * ordem e a gravar-se a meio.
 *
 * Apagar tudo repõe a frase de sempre, e é o servidor que decide qual é. Assim
 * não há duas versões dela do lado do browser à espera de ficarem diferentes.
 */
function Frase({
  inicial, aoGuardar,
}: { inicial: string; aoGuardar: (v: string | null) => void }) {
  const [texto, setTexto] = useState(inicial)
  const [guardado, setGuardado] = useState(false)
  const gravado = useRef(inicial)

  // Se o painel recarregar com outra frase (outro separador, por exemplo), o
  // campo acompanha, desde que não haja nada por gravar aqui.
  useEffect(() => {
    if (gravado.current === texto) {
      gravado.current = inicial
      setTexto(inicial)
    }
    // Só quando a frase do servidor muda: seguir `texto` punha o campo a
    // lutar contra quem está a escrever nele.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inicial])

  const sair = () => {
    const limpo = texto.trim()
    if (limpo === gravado.current.trim()) return
    gravado.current = limpo
    aoGuardar(limpo || null)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2200)
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor="frase" className="label-sm">O que os convidados leem</label>
        {guardado && (
          <span className="text-[11px] text-titanium/45 flex items-center gap-1">
            <Check size={11} /> Guardado
          </span>
        )}
      </div>

      <textarea
        id="frase"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={sair}
        rows={3}
        maxLength={240}
        className="w-full mt-3 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-titanium/85 leading-relaxed resize-none focus:border-white/30 outline-none transition-colors"
      />

      <div className="flex items-center justify-between gap-3 mt-2">
        <p className="text-xs text-titanium/35 leading-relaxed">
          Aparece por cima do botão, na página deles.
        </p>
        <button
          type="button"
          onClick={() => {
            gravado.current = ''
            setTexto('')
            aoGuardar(null)
            setGuardado(true)
            setTimeout(() => setGuardado(false), 2200)
          }}
          className="shrink-0 text-xs text-titanium/35 hover:text-titanium/75 transition-colors"
        >
          Repor a original
        </button>
      </div>
    </div>
  )
}

function Interruptor({
  ligado, aoMudar, titulo, nota, esbatido,
}: {
  ligado: boolean
  aoMudar: (v: boolean) => void
  titulo: string
  nota: string
  /** Continua a funcionar; só está sem efeito enquanto outra definição estiver
   *  como está. Esbatido e não desligado: o valor é o que eles escolheram. */
  esbatido?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      onClick={() => aoMudar(!ligado)}
      className={`w-full flex items-start gap-4 text-left transition-opacity ${esbatido ? 'opacity-45' : ''}`}
    >
      {/*
        Com o interruptor desligado o botão é claro sobre o carril escuro, e
        ligado é escuro sobre o carril claro. Manter o botão escuro nos dois
        estados dava, no desligado, um círculo preto sobre cinzento quase
        preto: quem olhasse via um carril vazio e não um interruptor.
      */}
      <span className={`mt-0.5 w-10 h-6 rounded-full shrink-0 transition-colors ${ligado ? 'bg-titanium/85' : 'bg-white/10'}`}>
        <span className={`block w-5 h-5 mt-0.5 rounded-full transition-transform ${ligado ? 'bg-eerie translate-x-[18px]' : 'bg-titanium/45 translate-x-0.5'}`} />
      </span>
      <span className="min-w-0">
        <span className="block text-titanium/85">{titulo}</span>
        <span className="block text-sm text-titanium/40 mt-1 leading-relaxed">{nota}</span>
      </span>
    </button>
  )
}

/**
 * Quando não há chave, ou a chave não serve.
 *
 * Não há campo para escrever uma chave: ela tem 48 caracteres e ninguém a
 * escreve à mão. O que serve é voltar ao link original, e é isso que a página
 * diz.
 */
function Portao({ comChave }: { comChave: boolean }) {
  return (
    <div className="min-h-screen flex items-center justify-center container-px text-center">
      <div className="max-w-sm">
        <img src={asset('brand/logo-symbol-white.png')} alt="" aria-hidden className="h-10 w-auto mx-auto mb-8 opacity-40" />
        <h1 className="font-serif text-3xl">
          {comChave ? 'Este link já não serve' : 'Falta a chave'}
        </h1>
        <p className="text-titanium/50 leading-relaxed mt-4">
          {comChave
            ? 'A chave deste link deixou de ser válida. Peçam-nos o link novo e volta tudo ao sítio.'
            : 'Este endereço só abre com o link completo que vos demos. Procurem a mensagem onde ele veio, ou peçam-nos outro.'}
        </p>
        <a
          href={`mailto:${CONTACT.email}`}
          className="inline-block mt-8 label-sm hover:text-titanium/80 transition-colors"
        >
          Falar connosco
        </a>
      </div>
    </div>
  )
}

function AEsperar({ erro }: { erro: boolean }) {
  return (
    <div className="min-h-screen flex items-center justify-center container-px text-center">
      {erro ? (
        <div>
          <h1 className="font-serif text-3xl">Algo correu mal</h1>
          <p className="text-titanium/50 mt-3">Tentem outra vez daqui a pouco.</p>
        </div>
      ) : (
        <Loader2 size={22} className="animate-spin text-titanium/25" />
      )}
    </div>
  )
}
