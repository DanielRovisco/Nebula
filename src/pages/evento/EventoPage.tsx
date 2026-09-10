import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, ImagePlus } from 'lucide-react'
import Seo from '../../lib/Seo'
import InstagramIcon from '../../lib/InstagramIcon'
import { asset } from '../../lib/asset'
import { CONTACT, absoluteUrl } from '../../lib/site'
import {
  type GaleriaEvento, type InfoEvento,
  ErroEvento, FRASE_DE_OMISSAO, galeriaEvento, infoEvento,
} from '../../lib/evento/api'
import { minhaChave } from '../../lib/evento/fila'
import { useFila } from '../../lib/evento/useFila'
import MinhasFotos from './MinhasFotos'
import Galeria from './Galeria'

/**
 * A página do convidado.
 *
 * Chega-se aqui por código QR, em pé, num casamento, com uma mão ocupada. É
 * essa a única situação para que esta página foi desenhada, e explica tudo o
 * que ela não tem: não há registo, não há palavra-passe, não há aplicação para
 * instalar, não há passo nenhum antes do botão.
 *
 * O cuidado no desenho não é vaidade. Quem está a ler isto foi convidado para
 * um casamento e pode estar a planear o dele: esta página é, para muita gente,
 * a única coisa que vai ver do nosso trabalho antes de decidir se nos procura.
 */

const MB = 1024 * 1024
const tamanho = (b: number) =>
  b >= 1024 * MB ? `${(b / 1024 / MB).toFixed(1)} GB` : `${Math.max(1, Math.round(b / MB))} MB`

export default function EventoPage() {
  const { slug = '' } = useParams()
  const reduzido = useReducedMotion()

  const [info, setInfo] = useState<InfoEvento | null>(null)
  const [deCache, setDeCache] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [galeria, setGaleria] = useState<GaleriaEvento | null>(null)
  const [autor, setAutor] = useState(() => {
    try { return localStorage.getItem('nebula-evento-nome') ?? '' } catch { return '' }
  })
  const [aArrastar, setAArrastar] = useState(false)
  const escolher = useRef<HTMLInputElement>(null)

  const fila = useFila(slug)
  const chave = useMemo(() => minhaChave(slug), [slug])

  /*
    A informação do evento é pedida à entrada e outra vez sempre que a rede
    volta. O segundo pedido interessa mais do que parece: quem chega ao
    casamento sem sinal fica com a página desenhada a partir da cópia local, e é
    este que a põe a par assim que houver rede.
  */
  useEffect(() => {
    let vivo = true
    const buscar = () => {
      infoEvento(slug)
        .then(({ info: i, deCache: c }) => {
          if (!vivo) return
          setInfo(i)
          setDeCache(c)
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

  const recarregarGaleria = useCallback(() => {
    galeriaEvento(slug, chave).then(setGaleria).catch(() => {})
  }, [slug, chave])

  /*
    A galeria actualiza-se quando a fila acaba, e não a cada ficheiro. A meio de
    trinta uploads, trinta pedidos ao servidor não mostrariam nada de novo que
    valesse a rede que gastavam.
  */
  useEffect(() => {
    if (!info || fila.aEnviar) return
    recarregarGaleria()
  }, [info, fila.aEnviar, recarregarGaleria])

  const aceitar = (fs: File[]) => {
    if (!fs.length) return
    const nome = autor.trim()
    if (nome) { try { localStorage.setItem('nebula-evento-nome', nome) } catch { /* modo privado */ } }
    fila.adicionar(fs, nome || undefined)
  }

  const aoEscolher = (e: React.ChangeEvent<HTMLInputElement>) => {
    aceitar(Array.from(e.target.files ?? []))
    // Limpar permite voltar a escolher o mesmo ficheiro logo a seguir, o que de
    // outra forma o browser ignorava em silêncio.
    e.target.value = ''
  }

  if (erro === 'nao_encontrado') {
    return <Aviso titulo="Link não encontrado" texto="Confirma o endereço com os noivos, ou volta a ler o código." />
  }
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

  const entra = (atraso: number) =>
    reduzido
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.8, delay: atraso, ease: [0.16, 1, 0.3, 1] as const },
        }

  return (
    <div className="min-h-screen pb-24">
      <Seo
        title={`Fotografias de ${info.coupleName}`}
        description="Partilha as tuas fotografias e vídeos do casamento."
        noindex
      />

      <header className="container-px pt-14 sm:pt-20 text-center">
        <motion.img
          src={asset('brand/logo-symbol-white.png')}
          alt=""
          aria-hidden
          width={1252}
          height={1494}
          {...(reduzido ? {} : {
            initial: { opacity: 0, y: 8 },
            animate: { opacity: 0.5, y: 0 },
            transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] as const },
          })}
          className="h-10 w-auto mx-auto mb-7 opacity-50"
        />

        <div className="overflow-hidden">
          <motion.h1
            {...(reduzido ? {} : {
              initial: { y: '110%' },
              animate: { y: 0 },
              transition: { duration: 1.1, delay: 0.1, ease: [0.16, 1, 0.3, 1] as const },
            })}
            className="font-serif leading-[1.05]"
            style={{ fontSize: 'clamp(2.25rem, 8vw, 4rem)' }}
          >
            {info.coupleName}
          </motion.h1>
        </div>

        <motion.p {...entra(0.55)} className="label-sm mt-5">{data}</motion.p>
      </header>

      <main className="container-px max-w-2xl mx-auto">
        {info.aberto ? (
          <motion.section {...entra(0.7)} className="mt-10 sm:mt-12">
            {/*
              A frase é dos noivos, e é a única parte desta página que fala com
              a voz deles. `text-balance` reparte as linhas em vez de deixar a
              última com uma palavra só.
            */}
            <p className="text-titanium/60 leading-relaxed text-center text-balance max-w-md mx-auto">
              {info.welcome ?? FRASE_DE_OMISSAO}
            </p>

            <input
              ref={escolher}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={aoEscolher}
              className="sr-only"
            />

            {/*
              Arrastar só serve a quem está num computador, e mesmo assim é raro
              nesta página. Está cá porque não custa nada e porque quem o tenta
              e vê que funciona fica com a ideia certa sobre o resto.
            */}
            <motion.button
              onClick={() => escolher.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setAArrastar(true) }}
              onDragLeave={() => setAArrastar(false)}
              onDrop={(e) => {
                e.preventDefault()
                setAArrastar(false)
                aceitar(Array.from(e.dataTransfer.files))
              }}
              whileTap={reduzido ? undefined : { scale: 0.985 }}
              className={`group relative w-full mt-7 rounded-3xl border border-dashed p-8 sm:p-10 flex flex-col items-center gap-3 transition-colors duration-300 ${
                aArrastar
                  ? 'border-titanium/55 bg-white/[0.07]'
                  : 'border-white/15 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.055]'
              }`}
            >
              <span className="w-14 h-14 rounded-full bg-titanium text-eerie flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
                <ImagePlus size={22} />
              </span>
              <span className="font-serif text-2xl sm:text-3xl mt-1">Escolher fotografias</span>
              <span className="text-xs text-titanium/40">
                Fotografias e vídeos, até {tamanho(info.maxFileBytes)} cada
              </span>
            </motion.button>

            <label className="block mt-6 max-w-xs mx-auto text-center">
              <input
                value={autor}
                onChange={(e) => setAutor(e.target.value)}
                maxLength={60}
                placeholder="O teu nome, se quiseres"
                className="w-full bg-transparent border-b border-white/12 px-2 py-2.5 text-center text-titanium/85 placeholder:text-titanium/25 focus:border-white/35 outline-none transition-colors"
              />
            </label>

            {deCache && !fila.online && (
              <p className="mt-6 text-xs text-titanium/45 text-center leading-relaxed">
                Estás sem rede. Escolhe à mesma: fica tudo guardado no telemóvel
                e sobe sozinho quando a rede voltar.
              </p>
            )}
          </motion.section>
        ) : (
          <section className="mt-10 text-center">
            <p className="text-titanium/55 leading-relaxed">
              Os envios já fecharam. Obrigado a quem partilhou.
            </p>
          </section>
        )}

        <MinhasFotos
          itens={fila.itens}
          online={fila.online}
          comErro={fila.comErro}
          aoRepetir={fila.repetir}
          aoRemover={fila.remover}
        />

        {galeria?.escondido ? (
          <section className="mt-16 text-center">
            <p className="text-titanium/50 text-sm leading-relaxed max-w-sm mx-auto">
              As fotografias ficam à espera
              {galeria.revealAt
                ? ` até ${new Date(galeria.revealAt).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })}`
                : ''}
              . Os noivos quiseram vê-las primeiro, todos ao mesmo tempo.
            </p>
          </section>
        ) : (
          <Galeria media={galeria?.media ?? []} />
        )}

        <Assinatura />

        {/*
          A promessa de privacidade fica na página, e não escondida numa
          política. Quem carrega uma fotografia tem direito a saber para onde
          ela vai antes de a carregar, não depois.

          Fica no fim e em letra pequena porque é isso que ela é: uma nota de
          rodapé que tem de estar lá e ser encontrável, não um aviso a competir
          com o botão. Quatro linhas soltas ocupavam meia página a dizer o que
          cabe em quatro linhas de texto corrido.
        */}
        <section className="mt-14 pt-7 border-t border-white/[0.07]">
          <span className="label-sm">O que acontece às tuas fotografias</span>
          <p className="mt-3 text-xs text-titanium/40 leading-relaxed max-w-md">
            Vão para os noivos e mais ninguém: não são publicadas nem vendidas.
            Não te é pedida conta, email ou número, e o nome é opcional. Ficam
            guardadas na Europa, num espaço privado e sem endereço público. E
            enquanto os envios estiverem abertos, podes apagar as tuas aqui.
          </p>
        </section>
      </main>
    </div>
  )
}

/**
 * Quem fez isto, e onde se vê mais.
 *
 * Fica no fim e não no princípio, de propósito. Quem abre esta página está a
 * meio de um casamento e veio entregar fotografias. Pôr-lhe o nosso portefólio
 * à frente disso era trocar o que ele veio fazer por aquilo que nós queremos.
 * No fim, depois de ter carregado, já viu a coisa a funcionar, e é o melhor
 * momento que vamos ter para lhe dizer quem somos.
 */
function Assinatura() {
  const reduzido = useReducedMotion()
  return (
    <motion.section
      initial={reduzido ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="mt-16 pt-10 border-t border-white/[0.07] text-center"
    >
      <img
        src={asset('brand/logo-symbol-white.png')}
        alt=""
        aria-hidden
        width={1252}
        height={1494}
        className="h-9 w-auto mx-auto opacity-45"
      />

      {/*
        Duas linhas, e a quebra é escrita e não deixada ao acaso: a primeira diz
        o que estamos aqui a fazer, a segunda é o convite. Juntas num parágrafo
        corrido, a segunda passava despercebida a seguir à primeira.
      */}
      <p className="font-serif text-xl sm:text-2xl leading-snug mt-6 max-w-sm mx-auto">
        Este dia está a ser contado por nós.
        <br />
        Um dia gostaríamos de contar o teu.
      </p>

      {/*
        Os dois abrem noutro separador. Não é boa educação, é necessário: quem
        estiver a meio de enviar um vídeo e sair desta página pára os envios, e
        o casamento fica sem essas fotografias por causa de um link nosso.
      */}
      <div className="flex flex-wrap justify-center gap-2 mt-6">
        <a href={absoluteUrl('portfolio')} target="_blank" rel="noreferrer" className={BOTAO_LEVE}>
          Ver o nosso trabalho <ArrowUpRight size={13} />
        </a>
        <a href={CONTACT.instagram} target="_blank" rel="noreferrer" className={BOTAO_LEVE}>
          <InstagramIcon size={13} /> {CONTACT.instagramHandle}
        </a>
      </div>
    </motion.section>
  )
}

const BOTAO_LEVE =
  'inline-flex items-center gap-2 px-5 py-3 rounded-full border border-white/12 text-[11px] uppercase tracking-[0.12em] text-titanium/60 hover:border-white/35 hover:text-titanium/90 transition-all min-h-[44px]'

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center container-px text-center">
      <div className="max-w-sm">
        <img
          src={asset('brand/logo-symbol-white.png')}
          alt=""
          aria-hidden
          className="h-10 w-auto mx-auto mb-8 opacity-40"
        />
        <h1 className="font-serif text-3xl">{titulo}</h1>
        <p className="text-titanium/50 leading-relaxed mt-4">{texto}</p>
      </div>
    </div>
  )
}
