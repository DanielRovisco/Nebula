import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertCircle, ArrowUpRight, Check, CloudOff, ImagePlus, Loader2, RotateCw, X } from 'lucide-react'
import Seo from '../../lib/Seo'
import InstagramIcon from '../../lib/InstagramIcon'
import { asset } from '../../lib/asset'
import { CONTACT, absoluteUrl } from '../../lib/site'
import { type GaleriaEvento, type InfoEvento, ErroEvento, galeriaEvento, infoEvento } from '../../lib/evento/api'
import { useFila } from '../../lib/evento/useFila'
import type { ItemFila } from '../../lib/evento/fila'

/**
 * A página do convidado.
 *
 * Chega-se aqui por QR code, em pé, num casamento, com uma mão ocupada. É essa
 * a única situação para que esta página foi desenhada, e explica tudo o que ela
 * não tem: não há registo, não há palavra-passe, não há aplicação para
 * instalar, não há passo nenhum antes do botão. Abre-se o link e o botão de
 * escolher fotografias está logo à vista, sem ser preciso deslizar.
 *
 * Não pede conta a ninguém — de propósito, e não por falta de tempo. Pedir uma
 * conta a alguém que só quer entregar três fotografias de um copo de água é a
 * forma mais fiável de não receber as três fotografias.
 */

const MB = 1024 * 1024
const tamanho = (b: number) =>
  b >= 1024 * MB ? `${(b / 1024 / MB).toFixed(1)} GB` : `${Math.max(1, Math.round(b / MB))} MB`

const RECADOS: Record<string, string> = {
  ficheiro_grande: 'Ficheiro grande demais',
  evento_cheio: 'Não há espaço, avisa os noivos',
  tipo_nao_aceite: 'Só fotografias e vídeos',
  janela_fechada: 'Os envios já fecharam',
  sem_rede: 'Sem rede, vai tentar outra vez',
  falha_upload: 'Falhou, vai tentar outra vez',
}

export default function EventoPage() {
  const { slug = '' } = useParams()
  const [info, setInfo] = useState<InfoEvento | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [galeria, setGaleria] = useState<GaleriaEvento | null>(null)
  const [deCache, setDeCache] = useState(false)
  const [autor, setAutor] = useState(() => localStorage.getItem('nebula-evento-nome') ?? '')
  const escolher = useRef<HTMLInputElement>(null)

  const fila = useFila(slug)

  /*
    A informação do evento é pedida à entrada e outra vez sempre que a rede
    volta. O segundo pedido interessa mais do que parece: quem chega ao
    casamento sem sinal fica com a página desenhada a partir da cópia local, e
    é este que a põe a par assim que houver rede.
  */
  useEffect(() => {
    let vivo = true
    const buscar = () => {
      infoEvento(slug)
        .then(({ info: i, deCache }) => {
          if (!vivo) return
          setInfo(i)
          setDeCache(deCache)
          setErro(null)
        })
        .catch((e: ErroEvento) => {
          if (!vivo) return
          setErro(e.codigo === 'nao_encontrado' ? 'nao_encontrado' : 'erro')
        })
    }
    buscar()
    window.addEventListener('online', buscar)
    return () => { vivo = false; window.removeEventListener('online', buscar) }
  }, [slug])

  // Os ids do que este browser carregou. Com a galeria fechada aos convidados,
  // é isto que o servidor usa para lhe mostrar as fotografias dele e mais nada.
  const meusIds = useMemo(
    () => fila.itens.map((i) => i.mediaId).filter((x): x is string => Boolean(x)),
    [fila.itens],
  )

  const recarregarGaleria = useCallback(() => {
    galeriaEvento(slug, meusIds).then(setGaleria).catch(() => {})
  }, [slug, meusIds])

  // A galeria actualiza-se quando acaba de enviar, e não a cada ficheiro: a
  // meio de trinta uploads, trinta pedidos ao servidor não mostrariam nada de
  // novo que valesse a rede que gastavam.
  useEffect(() => {
    if (!info || fila.aEnviar) return
    recarregarGaleria()
  }, [info, fila.aEnviar, recarregarGaleria])

  const aoEscolher = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fs = Array.from(e.target.files ?? [])
    if (fs.length) {
      if (autor.trim()) localStorage.setItem('nebula-evento-nome', autor.trim())
      fila.adicionar(fs, autor.trim() || undefined)
    }
    // Limpar permite voltar a escolher o mesmo ficheiro logo a seguir, o que de
    // outra forma o browser ignorava em silêncio.
    e.target.value = ''
  }

  if (erro === 'nao_encontrado') return <Aviso titulo="Link não encontrado" texto="Confirma o endereço com os noivos, ou volta a ler o código." />
  // Só se desiste quando não há informação nenhuma. Com a cópia local em mão, a
  // página abre à mesma e a falha de rede passa a ser um aviso, não um beco.
  if (erro && !info) {
    return (
      <Aviso
        titulo="Sem ligação"
        texto="Não deu para chegar ao servidor. Tenta outra vez daqui a pouco. As fotografias que escolheres ficam guardadas."
      />
    )
  }
  if (!info) return <div className="min-h-screen" />

  const data = new Date(info.eventDate).toLocaleDateString('pt-PT', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="min-h-screen pb-24">
      <Seo title={`Fotografias de ${info.coupleName}`} description="Partilha as tuas fotografias e vídeos do casamento." noindex />

      <header className="container-px pt-16 sm:pt-24 text-center">
        <span className="label-sm">Casamento</span>
        <h1 className="mt-3 leading-[1.05]" style={{ fontSize: 'clamp(2rem, 7vw, 3.5rem)' }}>
          {info.coupleName}
        </h1>
        <p className="text-titanium/45 mt-3 text-sm">{data}</p>
      </header>

      <main className="container-px max-w-2xl mx-auto">
        {info.aberto ? (
          <section className="mt-10 sm:mt-14">
            <p className="text-titanium/60 leading-relaxed text-center">
              Tiraste alguma coisa boa? Deixa-a aqui. Não é preciso conta nenhuma,
              e as fotografias sobem com a qualidade que têm.
            </p>

            <label className="block mt-8">
              <span className="label-sm">O teu nome, se quiseres</span>
              <input
                value={autor}
                onChange={(e) => setAutor(e.target.value)}
                maxLength={60}
                placeholder="Opcional"
                className="w-full mt-2 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-titanium/85 placeholder:text-titanium/25 focus:border-white/30 outline-none transition-colors"
              />
            </label>

            <input
              ref={escolher}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={aoEscolher}
              className="sr-only"
            />
            <button
              onClick={() => escolher.current?.click()}
              className="w-full mt-4 flex items-center justify-center gap-3 px-6 py-5 rounded-2xl bg-titanium text-eerie font-medium hover:bg-titanium/90 transition-colors min-h-[64px]"
            >
              <ImagePlus size={20} /> Escolher fotografias e vídeos
            </button>

            <p className="text-titanium/35 text-xs text-center mt-3">
              Até {tamanho(info.maxFileBytes)} por ficheiro. Vídeos incluídos.
            </p>

            {(deCache || !fila.online) && (
              <p className="mt-5 flex items-center justify-center gap-2 text-xs text-titanium/55">
                <CloudOff size={14} />
                Sem rede. O que escolheste está guardado e sobe quando a rede voltar.
              </p>
            )}
          </section>
        ) : (
          <section className="mt-10 text-center">
            <p className="text-titanium/60 leading-relaxed">
              Os envios já fecharam. Obrigado a quem partilhou.
            </p>
          </section>
        )}

        {fila.itens.length > 0 && <Fila fila={fila} />}

        <Galeria galeria={galeria} />

        {/*
          A promessa de privacidade fica na página, e não escondida numa
          política. Quem carrega uma fotografia tem direito a saber para onde
          ela vai antes de a carregar, não depois.
        */}
        <section className="mt-16 pt-8 border-t border-white/[0.07]">
          <span className="label-sm">O que acontece às tuas fotografias</span>
          <ul className="mt-4 space-y-2 text-sm text-titanium/50 leading-relaxed">
            <li>Vão para os noivos e mais ninguém. Não são publicadas nem vendidas.</li>
            <li>Não te é pedida conta, email ou número. O nome é opcional.</li>
            <li>Ficam guardadas na Europa, num espaço privado, sem endereço público.</li>
            <li>Se te arrependeres de alguma, diz aos noivos e ela é apagada.</li>
          </ul>
        </section>

        <Assinatura />
      </main>
    </div>
  )
}

/**
 * Quem fez isto, e onde se vê mais.
 *
 * Fica no fim e não no princípio, de propósito. Quem abre esta página está a
 * meio de um casamento, com o telemóvel numa mão, e veio entregar fotografias.
 * Pôr-lhe o nosso portefólio à frente antes disso era trocar o que ele veio
 * fazer por aquilo que nós queremos. No fim, depois de ter carregado, é outra
 * conversa: nessa altura já viu a coisa a funcionar, e é o melhor momento que
 * vamos ter para lhe dizer quem somos.
 */
function Assinatura() {
  return (
    <section className="mt-16 pt-10 border-t border-white/[0.07] text-center">
      <img
        src={asset('brand/logo-symbol-white.png')}
        alt=""
        aria-hidden
        width={1252}
        height={1494}
        className="h-9 w-auto mx-auto opacity-45"
      />

      {/*
        "Somos nós que fotografamos" e não "as fotografias são nossas". A
        segunda versão estava aqui e vinha logo a seguir a "vão para os noivos e
        mais ninguém, não são publicadas nem vendidas": lidas em sequência,
        parecia que estávamos a reclamar as fotografias que a pessoa tinha
        acabado de entregar. Dizer o contrário do que se acabou de prometer, na
        mesma página, é a melhor forma de não ser acreditado em nenhuma das
        duas.
      */}
      <p className="text-titanium/50 text-sm leading-relaxed mt-5 max-w-xs mx-auto">
        Somos nós que fotografamos este casamento. Se um dia for o teu dia, ou o
        de alguém teu, gostávamos de o contar.
      </p>

      {/*
        Os dois abrem noutro separador. Não é boa educação, é necessário: quem
        estiver a meio de enviar um vídeo e sair desta página pára os envios, e
        o casamento fica sem essas fotografias por causa de um link nosso.
      */}
      <div className="flex flex-wrap justify-center gap-2 mt-6">
        <a
          href={absoluteUrl('portfolio')}
          target="_blank"
          rel="noreferrer"
          className={BOTAO_LEVE}
        >
          Ver o nosso trabalho <ArrowUpRight size={13} />
        </a>
        <a
          href={CONTACT.instagram}
          target="_blank"
          rel="noreferrer"
          className={BOTAO_LEVE}
        >
          <InstagramIcon size={13} /> {CONTACT.instagramHandle}
        </a>
      </div>
    </section>
  )
}

const BOTAO_LEVE =
  'inline-flex items-center gap-2 px-5 py-3 rounded-full border border-white/12 text-[11px] uppercase tracking-[0.12em] text-titanium/60 hover:border-white/35 hover:text-titanium/90 transition-all min-h-[44px]'

function Fila({ fila }: { fila: ReturnType<typeof useFila> }) {
  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <span className="label-sm">
          {fila.porEnviar > 0
            ? `A enviar ${fila.enviados + 1} de ${fila.enviados + fila.porEnviar}`
            : `${fila.enviados} ${fila.enviados === 1 ? 'ficheiro entregue' : 'ficheiros entregues'}`}
        </span>
        {fila.comErro > 0 && (
          <button
            onClick={fila.repetir}
            className="flex items-center gap-1.5 text-xs text-titanium/60 hover:text-titanium transition-colors"
          >
            <RotateCw size={12} /> Tentar outra vez
          </button>
        )}
      </div>

      <ul className="mt-4 space-y-1.5">
        {fila.itens.map((i) => (
          <LinhaFila key={i.id} item={i} aoRemover={() => fila.remover(i.id)} />
        ))}
      </ul>
    </section>
  )
}

function LinhaFila({ item, aoRemover }: { item: ItemFila; aoRemover: () => void }) {
  return (
    <li className="relative overflow-hidden rounded-lg bg-white/[0.04] px-3 py-2.5">
      {/* A barra é o próprio fundo da linha: mostra o progresso sem acrescentar
          um elemento a mais numa lista que pode ter trinta. */}
      {item.estado === 'a-enviar' && (
        <div
          className="absolute inset-y-0 left-0 bg-white/[0.06] transition-[width] duration-200"
          style={{ width: `${Math.round(item.progresso * 100)}%` }}
        />
      )}
      <div className="relative flex items-center gap-3">
        <span className="shrink-0 text-titanium/40">
          {item.estado === 'feito' && <Check size={14} className="text-titanium/70" />}
          {item.estado === 'a-enviar' && <Loader2 size={14} className="animate-spin" />}
          {item.estado === 'espera' && <Loader2 size={14} className="opacity-40" />}
          {item.estado === 'erro' && <AlertCircle size={14} className="text-titanium/70" />}
        </span>
        <span className="flex-1 min-w-0 truncate text-sm text-titanium/70">{item.nome}</span>
        <span className="shrink-0 text-xs text-titanium/35">
          {item.estado === 'erro' ? (RECADOS[item.erro ?? ''] ?? 'Falhou') : tamanho(item.tamanho)}
        </span>
        {item.estado === 'erro' && (
          <button onClick={aoRemover} aria-label={`Retirar ${item.nome}`} className="shrink-0 text-titanium/40 hover:text-titanium/80 transition-colors">
            <X size={14} />
          </button>
        )}
      </div>
    </li>
  )
}

function Galeria({ galeria }: { galeria: GaleriaEvento | null }) {
  if (!galeria) return null

  if (galeria.escondido) {
    const quando = galeria.revealAt
      ? new Date(galeria.revealAt).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })
      : null
    return (
      <section className="mt-14 text-center">
        <p className="text-titanium/50 text-sm leading-relaxed">
          As fotografias ficam à espera{quando ? ` até ${quando}` : ''}. Os noivos
          quiseram vê-las primeiro, todos ao mesmo tempo.
        </p>
      </section>
    )
  }

  if (galeria.media.length === 0) return null

  return (
    <section className="mt-14">
      <span className="label-sm">
        {galeria.media.length === 1 ? '1 momento' : `${galeria.media.length} momentos`}
      </span>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {galeria.media.map((m) =>
          m.kind === 'video' ? (
            <video
              key={m.id}
              src={m.url}
              controls
              playsInline
              preload="metadata"
              className="w-full aspect-square object-cover rounded-md bg-white/[0.04]"
            />
          ) : (
            <img
              key={m.id}
              src={m.thumbUrl ?? m.url}
              alt={m.name ? `Fotografia de ${m.name}` : 'Fotografia do casamento'}
              loading="lazy"
              className="w-full aspect-square object-cover rounded-md bg-white/[0.04]"
            />
          ),
        )}
      </div>
    </section>
  )
}

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center container-px text-center">
      <div>
        <h1 className="text-3xl">{titulo}</h1>
        <p className="text-titanium/50 mt-3">{texto}</p>
      </div>
    </div>
  )
}
