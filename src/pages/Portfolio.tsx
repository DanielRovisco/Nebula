import { useCallback, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { flushSync } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Play } from 'lucide-react'
import Reveal from '../lib/Reveal'
import Picture from '../lib/Picture'
import Seo from '../lib/Seo'
import Lightbox from '../components/Lightbox'
import GridCursor from '../components/GridCursor'
import { useLink, useT } from '../lib/i18n'
import Breadcrumbs from '../components/Breadcrumbs'
import { breadcrumbJsonLd } from '../lib/breadcrumbJsonLd'
import { comTransicao } from '../lib/viewTransition'
import { SITE_URL, absoluteUrl } from '../lib/site'
import { usePortfolio } from '../lib/site-content/useSiteContent'

// Conteúdo de reserva: é o que o site mostra enquanto (ou caso) não haja nada
// carregado pelo painel. Fica no código de propósito — assim a página abre
// cheia no primeiro render, sem esperar pela rede.
const FALLBACK: {
  name: string
  alt: string
  category: string
  tall?: boolean
  pos: string
}[] = [
  { name: 'palace-dome', alt: 'Retrato sob a cúpula de um palácio, em contraluz', category: 'Retratos', tall: true, pos: 'center center' },
  { name: 'forest-bride', alt: 'Sessão editorial em vestido longo branco, entre árvores', category: 'Retratos', pos: 'center 20%' },
  { name: 'hero-beach-dress', alt: 'Vestido longo branco numa praia, entre falésias', category: 'Retratos', pos: 'center 25%' },
  { name: 'gender-reveal-beach', alt: 'Revelação do sexo do bebé numa praia', category: 'Maternidade', pos: 'center center' },
  { name: 'maternity-railway', alt: 'Sessão de maternidade junto a uma linha de ferro', category: 'Maternidade', tall: true, pos: 'center center' },
  { name: 'maternity-sunset-couple', alt: 'Casal à espera de bebé ao pôr do sol', category: 'Maternidade', pos: 'center 30%' },
  { name: 'baby-balloons', alt: 'Retrato de bebé rodeado de balões', category: 'Retratos', pos: 'center 15%' },
  { name: 'editorial-studio-1', alt: 'Retrato editorial em estúdio', category: 'Retratos', pos: 'center center' },
  { name: 'editorial-dramatic', alt: 'Retrato editorial com iluminação dramática', category: 'Retratos', tall: true, pos: 'center 20%' },
  { name: 'editorial-blue-dress', alt: 'Retrato editorial de vestido azul', category: 'Retratos', pos: 'center 15%' },
  { name: 'editorial-purple', alt: 'Retrato editorial em tons de violeta', category: 'Retratos', pos: 'center 20%' },
  { name: 'editorial-lake', alt: 'Sessão editorial junto a um lago', category: 'Retratos', pos: 'center center' },
  { name: 'editorial-studio-2', alt: 'Segundo retrato editorial em estúdio', category: 'Retratos', pos: 'center 25%' },
  { name: 'editorial-autumn', alt: 'Sessão editorial em folhas de outono', category: 'Retratos', pos: 'center 30%' },
]

/*
  Não há categoria de casamentos porque não há, ainda, uma fotografia de
  casamento no portfólio. As que aqui estavam eram sessões editoriais e uma de
  maternidade — mostrá-las sob esse nome era vender como casamento trabalho que
  não o é. Volta a existir no dia em que houver fotografias para lá pôr.
*/
const FALLBACK_CATEGORIES = ['Retratos', 'Maternidade']

// Duas colunas até md, três a partir daí — nunca uma imagem a ocupar a largura
// toda, por isso 50vw cobre todo o intervalo de telemóvel e tablet.
const GRID_SIZES = '(max-width: 768px) 50vw, 33vw'

// Cards altos ocupam duas linhas. A altura tem de ser exatamente dois cards
// curtos mais a goteira, senão a grelha deixa buracos.
const SHORT = 'h-[26vh] sm:h-[33vh]'
const TALL = 'h-[calc(52vh_+_0.5rem)] sm:h-[calc(66vh_+_1rem)]'

/** "Casamentos" → "casamentos", para casar com o hash vindo dos serviços. */
const slug = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')

export default function Portfolio() {
  const t = useT()
  const link = useLink()
  const { hash } = useLocation()
  const reduced = useReducedMotion()

  // As fotos do código entram como reserva; se houver portfólio carregado no
  // painel, substitui-as assim que chegar.
  const fallback = useMemo(
    () => ({
      categories: FALLBACK_CATEGORIES,
      items: FALLBACK.map((f) => ({
        id: f.name,
        // Estas vêm do repositório e têm derivados responsivos — daí o
        // localName, que faz o render usar o <Picture> com srcset.
        localName: f.name,
        src: '',
        thumb: '',
        alt: f.alt,
        category: f.category,
        tall: Boolean(f.tall),
        pos: f.pos,
      })),
    }),
    [],
  )

  const { categories, items } = usePortfolio(fallback)

  // Chegando de /servicos com #casamentos, a grelha abre já nessa categoria. O
  // hash traz o slug; as categorias vêm do painel com o nome por extenso.
  //
  // O hash é lido no render, não num efeito: assim a grelha nunca chega a ser
  // desenhada com tudo antes de encolher para a categoria pedida.
  const doHash = (() => {
    const pedida = decodeURIComponent(hash.replace('#', ''))
    return pedida ? categories.find((c) => slug(c) === pedida) : undefined
  })()

  const [escolhido, setFilter] = useState('')
  const [hashVisto, setHashVisto] = useState(hash)
  if (hash !== hashVisto) {
    setHashVisto(hash)
    if (doHash) setFilter(doHash)
  }
  // Na primeira vinda o `hashVisto` já nasce igual ao hash, por isso é aqui que
  // ele conta.
  const filter = escolhido || doHash || ''

  // O filtro "Todos" é o único cujo nome é nosso — as categorias vêm do painel
  // e são iguais nas duas línguas, porque são as mesmas fotografias.
  const TODOS = t.portfolio.all
  const filtros = [TODOS, ...categories]
  // `filter` arranca vazio para não fixar o nome do filtro "Todos" numa língua.
  // Vazio significa "sem filtro" e tem de mostrar tudo: tratá-lo como uma
  // categoria a sério deixava a grelha sem uma única fotografia.
  const filtered = !filter || filter === TODOS ? items : items.filter((i) => i.category === filter)

  // Índice da fotografia aberta em grande, e id de quem detém o nome partilhado
  // da transição na grelha. Só um elemento pode ter esse nome de cada vez: com
  // a fotografia aberta é a do lightbox, fechada é a miniatura correspondente.
  const [aberta, setAberta] = useState<number | null>(null)
  const [foco, setFoco] = useState<string | null>(null)

  const abrir = useCallback(
    (i: number, id: string) => {
      // Primeiro entrega-se o nome à miniatura, num render à parte: ela tem de
      // já o ter quando o browser fotografa o "antes" da transição.
      flushSync(() => setFoco(id))
      comTransicao(() => flushSync(() => setAberta(i)), !reduced)
    },
    [reduced],
  )

  const fechar = useCallback(() => {
    comTransicao(() => flushSync(() => setAberta(null)), !reduced)
  }, [reduced])

  // Navegar dá a volta nas pontas: da última salta para a primeira. Sem
  // transição partilhada — aqui a fotografia é substituída, não deslocada.
  const saltar = useCallback(
    (passo: number) => {
      setAberta((i) => {
        if (i === null) return i
        const proximo = (i + passo + filtered.length) % filtered.length
        setFoco(filtered[proximo]?.id ?? null)
        return proximo
      })
    },
    [filtered],
  )

  return (
    <div className="pt-28 sm:pt-36 pb-20 sm:pb-28">
      <Seo
        title={t.portfolio.seoTitle}
        description={t.portfolio.seoDescription}
        image={absoluteUrl('/brand/portfolio/palace-dome-1440.webp')}
        jsonLd={[
          breadcrumbJsonLd([
            { nome: t.nav.home, caminho: link('home') },
            { nome: t.nav.portfolio, caminho: link('portfolio') },
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'ImageGallery',
            name: t.portfolio.seoTitle,
            description: t.portfolio.seoDescription,
            url: `${SITE_URL}${link('portfolio')}`,
          },
        ]}
      />

      <section className="container-px mb-12 sm:mb-16">
        <Breadcrumbs items={[{ label: t.nav.portfolio }]} />
        <Reveal>
          <span className="label-sm">{t.portfolio.label}</span>
          <h1 className="mt-4 max-w-3xl leading-[1.05]" style={{ fontSize: 'clamp(2.2rem, 6vw, 5rem)' }}>
            {t.portfolio.title}
          </h1>
        </Reveal>
      </section>

      <section
        className="container-px mb-10 sm:mb-14 flex gap-2.5 flex-wrap"
        role="group"
        aria-label={t.portfolio.filterLabel}
      >
        {filtros.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={(filter || TODOS) === f}
            className={`px-6 sm:px-7 py-3 rounded-full text-[11px] sm:text-xs uppercase tracking-[0.12em] border transition-all duration-300 active:scale-95 min-h-[44px] ${
              (filter || TODOS) === f
                ? 'bg-titanium text-eerie border-titanium'
                : 'border-white/15 text-titanium/60 hover:border-white/40 hover:text-titanium/85'
            }`}
          >
            {f}
          </button>
        ))}
      </section>

      <section className="container-px">
        <div data-cursor-grid className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
          {filtered.map((item, i) => (
            <motion.div
              // `layout` animations em 14 cards ao mesmo tempo eram o ponto mais
              // pesado do site em telemóveis de gama média. Um fade de opacidade
              // dá a mesma leitura sem forçar o browser a medir tudo por frame.
              key={item.id}
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              // Stagger limitado: sem cap, o 14.º card só aparecia meio segundo
              // depois do primeiro.
              transition={{ duration: 0.4, delay: Math.min(i * 0.03, 0.24) }}
              className={`overflow-hidden rounded-xl group${item.tall ? ' row-span-2' : ''}`}
            >
              <button
                type="button"
                onClick={() => abrir(i, item.id)}
                aria-label={`${t.portfolio.openLarge}: ${item.alt}`}
                className={`relative overflow-hidden w-full block ${item.tall ? TALL : SHORT}`}
                // O nome só está na miniatura enquanto o lightbox estiver
                // fechado — de outro modo havia dois donos do mesmo nome.
                style={aberta === null && foco === item.id ? { viewTransitionName: 'foto' } : undefined}
              >
                {item.localName ? (
                  <Picture
                    name={item.localName}
                    alt={item.alt}
                    sizes={GRID_SIZES}
                    style={{ objectPosition: item.pos }}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                ) : (
                  <img
                    src={item.src}
                    alt={item.alt}
                    loading="lazy"
                    decoding="async"
                    style={{ objectPosition: item.pos }}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                )}
                {/*
                  Um vídeo com o primeiro fotograma parado é indistinguível de
                  uma fotografia. O símbolo diz o que vai acontecer ao clicar,
                  antes de se clicar.
                */}
                {item.video && (
                  <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="w-12 h-12 rounded-full bg-eerie/55 backdrop-blur-sm flex items-center justify-center">
                      <Play size={17} className="text-titanium ml-0.5" fill="currentColor" />
                    </span>
                  </span>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-eerie/65 via-transparent to-transparent sm:from-eerie/0 sm:group-hover:from-eerie/35 transition-colors duration-500" />
                <span className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 label-sm text-titanium/80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-500">
                  {item.category}
                </span>
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Sobre a grelha, o cursor do sistema dá lugar a uma bola com "Ver". */}
      {aberta === null && <GridCursor texto={t.portfolio.cursorView} />}

      {aberta !== null && filtered[aberta] && (
        <Lightbox
          item={filtered[aberta]}
          index={aberta}
          total={filtered.length}
          onClose={fechar}
          onPrev={() => saltar(-1)}
          onNext={() => saltar(1)}
        />
      )}
    </div>
  )
}
