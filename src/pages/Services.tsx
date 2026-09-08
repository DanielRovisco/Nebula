import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'
import Reveal from '../lib/Reveal'
import Picture from '../lib/Picture'
import { publicUrl } from '../lib/site-content/public'
import { useServiceCovers } from '../lib/site-content/useSiteContent'
import Seo from '../lib/Seo'
import { SITE_URL, absoluteUrl } from '../lib/site'
import { useLink, useT } from '../lib/i18n'
import Breadcrumbs from '../components/Breadcrumbs'
import { breadcrumbJsonLd } from '../lib/breadcrumbJsonLd'

/**
 * A estrutura dos packs vive aqui; os nomes e os itens vêm do dicionário. Assim
 * acrescentar um item a um pack é uma linha em cada língua, e nunca fica um
 * pack meio traduzido.
 */
const CATEGORIES = [
  {
    id: 'casamentos',
    // Sem correspondência no portfólio: ainda não há fotografias de casamento.
    portfolio: null,
    image: 'forest-bride',
    alt: 'Sessão editorial em vestido longo branco, entre árvores',
    imgPos: 'object-top',
    packs: [
      { name: 'essencia', items: ['photoEditorial', 'privateGallery', 'sneakPeek'] },
      { name: 'origem', items: ['photoVideo4k', 'privateGallery', 'sneakPeek', 'preWedding'] },
      { name: 'nebula', items: ['photoVideo4k', 'drone', 'preWedding', 'privateGallery', 'sneakPeek'] },
    ],
  },
  {
    id: 'maternidade',
    portfolio: 'maternidade',
    image: 'maternity-railway',
    alt: 'Sessão de maternidade junto a uma linha de ferro',
    imgPos: 'object-center',
    packs: [
      { name: 'essencia', items: ['photoSession', 'privateGallery'] },
      { name: 'cinemaFoto', items: ['photoVideoLifestyle', 'privateGallery', 'sneakPeek'] },
      { name: 'intimo', items: ['coupleSession', 'photoEditorial', 'privateGallery'] },
    ],
  },
  {
    id: 'retratos',
    portfolio: 'retratos',
    image: 'editorial-dramatic',
    alt: 'Retrato editorial com iluminação dramática',
    imgPos: 'object-[50%_20%]',
    packs: [
      { name: 'foto', items: ['photoSession', 'privateGallery'] },
      { name: 'editorial', items: ['photoEditorial', 'privateGallery', 'sneakPeek'] },
    ],
  },
  {
    id: 'eventos',
    // Os trabalhos que ilustram este serviço vivem em "Retratos".
    portfolio: 'retratos',
    image: 'baby-balloons',
    alt: 'Bebé rodeado de balões durante uma festa de família',
    imgPos: 'object-[50%_15%]',
    packs: [
      { name: 'foto', items: ['eventPhoto', 'privateGallery'] },
      { name: 'fotoVideo', items: ['eventPhotoVideo', 'privateGallery', 'sneakPeek'] },
    ],
  },
] as const

/** Só abrimos a categoria pedida se ela existir — o hash vem do URL. */
function categoriaDoHash(hash: string) {
  const id = decodeURIComponent(hash.replace('#', ''))
  return CATEGORIES.some((c) => c.id === id) ? id : null
}

export default function Services() {
  const t = useT()
  const link = useLink()
  const { hash } = useLocation()
  // Capas escolhidas no painel. Serviço sem capa lá fica com a do repositório.
  const capas = useServiceCovers()
  // Vindo de um cartão da página inicial (/servicos#maternidade), abre logo essa
  // categoria em vez da primeira.
  const [open, setOpen] = useState<string>(() => categoriaDoHash(hash) ?? 'casamentos')
  /*
    A barra das abas, para o salto vindo de um cartão da página inicial ficar
    com as abas à vista e não com o painel colado ao topo. Antes havia uma
    referência por categoria porque cada uma era uma secção; agora o painel é
    um só e o que interessa mostrar é a escolha.
  */
  const barraRef = useRef<HTMLDivElement | null>(null)
  const botoesRef = useRef<Record<string, HTMLButtonElement | null>>({})

  // Se o hash mudar sem sair da página (clicar noutro cartão a partir daqui),
  // acompanha-o já no render — sem efeito a disparar um segundo render.
  const [hashVisto, setHashVisto] = useState(hash)
  if (hash !== hashVisto) {
    setHashVisto(hash)
    const id = categoriaDoHash(hash)
    if (id && id !== open) setOpen(id)
  }

  useEffect(() => {
    const id = categoriaDoHash(hash)
    if (!id) return
    // Duas razões para o atraso: o ScrollToTop corre na mesma passagem e
    // desfaria o salto, e o painel ainda está a abrir — esperamos que assente
    // antes de medir. O desconto de 96px tira a categoria de debaixo da barra
    // fixa do topo.
    const t = setTimeout(() => {
      const el = barraRef.current
      if (!el) return
      const topo = el.getBoundingClientRect().top + window.scrollY - 96
      window.scrollTo({ top: Math.max(0, topo), behavior: 'smooth' })
    }, 150)
    return () => clearTimeout(t)
  }, [hash])

  /*
    Setas para mudar de aba, Home e End para a primeira e a última. É o que a
    norma manda para este padrão e é o que torna a barra utilizável sem rato:
    sem isto, e com uma só paragem de tabulação, quem navega por teclado
    chegava à barra e não conseguia sair da primeira aba.

    O foco vai para a aba nova a seguir a mudá-la, senão a selecção andava e o
    foco ficava para trás, e a leitura em voz alta deixava de corresponder ao
    que está escolhido.
  */
  function aoTeclado(e: React.KeyboardEvent<HTMLDivElement>) {
    // `string[]` e não a união literal: o `open` é uma string vinda do URL.
    const ids: string[] = CATEGORIES.map((c) => c.id)
    const i = ids.indexOf(open)
    let destino: string | null = null
    if (e.key === 'ArrowRight') destino = ids[(i + 1) % ids.length]
    else if (e.key === 'ArrowLeft') destino = ids[(i - 1 + ids.length) % ids.length]
    else if (e.key === 'Home') destino = ids[0]
    else if (e.key === 'End') destino = ids[ids.length - 1]
    if (!destino) return
    e.preventDefault()
    setOpen(destino)
    botoesRef.current[destino]?.focus()
  }

  return (
    <div className="pt-28 sm:pt-36 pb-20 sm:pb-28">
      <Seo
        title={t.services.seoTitle}
        description={t.services.seoDescription}
        image={absoluteUrl('/brand/portfolio/forest-bride-1440.webp')}
        jsonLd={[
          breadcrumbJsonLd([
            { nome: t.nav.home, caminho: link('home') },
            { nome: t.nav.services, caminho: link('services') },
          ]),
          // Um `Service` por categoria. Sem preços: declarar uma oferta sem
          // valor é pior do que não a declarar.
          ...CATEGORIES.map((cat) => ({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: t.home.services[cat.id].title,
            description: t.home.services[cat.id].tagline,
            serviceType: t.home.services[cat.id].title,
            provider: { '@type': 'LocalBusiness', name: 'NEBULA', '@id': `${SITE_URL}/` },
            areaServed: { '@type': 'Country', name: 'Portugal' },
            image: absoluteUrl(`/brand/portfolio/${cat.image}-1440.webp`),
            url: `${SITE_URL}${link('services')}#${cat.id}`,
          })),
        ]}
      />

      {/* Header */}
      <section className="container-px mb-12 sm:mb-24">
        <Breadcrumbs items={[{ label: t.nav.services }]} />
        <Reveal>
          <span className="label-sm">{t.services.label}</span>
          <h1 className="mt-4 max-w-3xl leading-[1.05]" style={{ fontSize: 'clamp(2.2rem, 6vw, 5rem)' }}>
            {t.services.title}
          </h1>
        </Reveal>
      </section>

      {/*
        Abas lado a lado, e não uma lista de painéis empilhados.

        Empilhadas, os quatro serviços ocupavam quatro ecrãs e quem chegava
        aqui via um e tinha de rolar para descobrir que havia mais. Lado a
        lado, a oferta toda lê-se de uma vez e comparar dois é um clique em vez
        de um passeio.

        Segue o padrão de abas da norma: `tablist`, `tab` e `tabpanel` com as
        ligações entre eles, uma só paragem de tabulação na barra, e as setas a
        mudar de aba. Sem isso são quatro botões que por acaso parecem abas, e
        quem navega por teclado tem de passar por todos para chegar ao último.
      */}
      <section className="container-px">
        <div
          ref={barraRef}
          role="tablist"
          aria-label={t.services.label}
          onKeyDown={aoTeclado}
          className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3"
        >
          {CATEGORIES.map((cat, idx) => {
            const activa = open === cat.id
            return (
              <button
                key={cat.id}
                ref={(el) => {
                  botoesRef.current[cat.id] = el
                }}
                role="tab"
                id={`aba-${cat.id}`}
                aria-selected={activa}
                aria-controls="painel-servico"
                /*
                  Só a aba escolhida recebe tabulação. É o que faz a barra
                  contar como uma paragem e não como quatro: entra-se nela,
                  muda-se com as setas, e sai-se para o conteúdo.
                */
                tabIndex={activa ? 0 : -1}
                onClick={() => setOpen(cat.id)}
                className={`rounded-xl border px-4 py-4 sm:py-5 text-left transition-colors min-h-[56px] ${
                  activa
                    ? 'border-white/35 bg-white/[0.05] text-titanium'
                    : 'border-white/10 text-titanium/60 hover:border-white/25 hover:text-titanium/85'
                }`}
              >
                <span className="font-mono text-[10px] tracking-[0.25em] text-titanium/45 block mb-1">
                  0{idx + 1}
                </span>
                <span className="block leading-tight" style={{ fontSize: 'clamp(0.95rem, 1.5vw, 1.15rem)' }}>
                  {t.home.services[cat.id].title}
                </span>
              </button>
            )
          })}
        </div>

        {/*
          Um painel só, que troca de conteúdo. A transição é uma passagem de
          opacidade curta e não uma abertura em altura: com as abas fixas por
          cima, animar a altura fazia a página saltar debaixo do cursor de cada
          vez que se mudava de serviço.
        */}
        <div
          role="tabpanel"
          id="painel-servico"
          aria-labelledby={`aba-${open}`}
          tabIndex={0}
          className="mt-6 sm:mt-8 border border-white/10 rounded-2xl p-6 sm:p-10"
        >
          <AnimatePresence mode="wait">
            {CATEGORIES.filter((c) => c.id === open).map((cat) => {
              const capa = capas[cat.id]
              return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="text-titanium/60 text-sm mb-6">{t.home.services[cat.id].tagline}</p>

                {/*
                  A fotografia ao lado dos packs e em retrato, não numa faixa
                  atravessada por cima deles.

                  A faixa tinha 64px de altura numa largura de mil e tal: nesse
                  formato não cabe fotografia nenhuma inteira, corta-se sempre
                  a cabeça ou os pés e o que sobra é uma tira de fundo. Num
                  site de fotografia, mostrar mal uma fotografia é o pior
                  defeito que uma página pode ter.

                  No telemóvel volta a ficar por cima, porque duas colunas
                  numa largura de 390px davam duas colunas más em vez de uma
                  boa, mas mantém o formato vertical.
                */}
                <div className="lg:grid lg:grid-cols-[0.85fr_1.5fr] lg:gap-8 lg:items-start">
                  {/*
                    3:4 e não outra proporção qualquer: é exactamente a das
                    fotografias de origem (480x640, 960x1280, 1440x1920), por
                    isso três das quatro categorias não sofrem corte nenhum. A
                    dos eventos é 0.89 e perde um pouco dos lados, e é para
                    isso que serve o `imgPos` de cada categoria.

                    O `sizes` leva 30vw e não uma largura fixa: a coluna
                    acompanha o ecrã, e num ecrã de alta densidade o browser
                    precisa de saber o espaço real para pedir a versão de 960 em
                    vez da de 480. Com uma largura fixa de 400px pedia a
                    pequena e entregava uma fotografia desfocada, que num site
                    de fotografia é o defeito que menos se pode dar ao luxo.
                  */}
                  {capa ? (
                    /*
                      Capa carregada no painel. É uma <img> simples e não o
                      <Picture>: o <Picture> escolhe entre tamanhos que só
                      existem para as fotografias do repositório, e uma capa
                      carregada tem um ficheiro só.

                      O recorte vem do painel em `pos` e entra por estilo, não
                      por classe: é um valor livre escolhido por quem carregou
                      a foto, e as classes do Tailwind são escritas antes de
                      existir alguém para as escolher.
                    */
                    <img
                      src={publicUrl(capa.storageKey)}
                      alt={capa.alt || cat.alt}
                      loading="lazy"
                      decoding="async"
                      style={{ objectPosition: capa.pos }}
                      className="w-full aspect-[3/4] rounded-xl object-cover mb-6 lg:mb-0"
                    />
                  ) : (
                    <Picture
                      name={cat.image}
                      alt={cat.alt}
                      sizes="(max-width: 1024px) 100vw, 30vw"
                      className={`w-full aspect-[3/4] rounded-xl object-cover ${cat.imgPos} mb-6 lg:mb-0`}
                    />
                  )}

                  <div>
                <div
                  className={`grid gap-4 ${
                    cat.packs.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2'
                  }`}
                >
                  {cat.packs.map((pack) => (
                    <div
                      key={pack.name}
                      className="border border-white/10 rounded-xl p-5 sm:p-6 flex flex-col hover:border-white/20 transition-colors"
                    >
                      <h3 className="text-base sm:text-lg mb-4">{t.services.packs[pack.name]}</h3>
                      <ul className="space-y-2.5 flex-1">
                        {pack.items.map((item) => (
                          <li key={item} className="flex items-start gap-2.5 text-sm text-titanium/55">
                            <Check size={13} className="mt-0.5 shrink-0 text-titanium/70" />
                            {t.services.items[item]}
                          </li>
                        ))}
                      </ul>
                      <Link
                        to={link('contact')}
                        className="mt-6 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-titanium/50 border-b border-titanium/25 pb-1 hover:border-titanium/60 hover:text-titanium/80 transition-all w-fit min-h-[44px]"
                      >
                        {t.common.requestProposal} <ArrowRight size={12} />
                      </Link>
                    </div>
                  ))}
                </div>

                {/*
                  Quem acaba de ler o que está incluído quer ver como fica, e o
                  portfólio abre já filtrado por esta categoria em vez de o
                  obrigar a procurar o filtro.

                  Só aparece quando o serviço tem mesmo uma categoria
                  correspondente. Um hash que não casa com categoria nenhuma
                  não dá erro: mostra o portfólio inteiro, sem filtro, como se
                  a ligação não tivesse feito nada, e quem clicou fica sem
                  perceber porquê.
                */}
                {cat.portfolio && (
                  <Link
                    to={`${link('portfolio')}#${cat.portfolio}`}
                    className="mt-6 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-titanium/50 border-b border-titanium/25 pb-1 hover:border-titanium/60 hover:text-titanium/80 transition-all"
                  >
                    {t.services.seeWork} <ArrowRight size={12} />
                  </Link>
                )}
                  </div>
                </div>
              </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </section>

      {/* Upsell */}
      <section className="container-px mt-16 sm:mt-28">
        <div className="border border-white/10 rounded-2xl p-8 sm:p-12 text-center">
          <Reveal>
            <span className="label-sm">{t.services.addonLabel}</span>
            <h2 className="text-2xl sm:text-4xl mt-4 mb-5">{t.services.addonTitle}</h2>
            <p className="text-titanium/55 max-w-md mx-auto text-sm leading-relaxed mb-8">
              {t.services.addonText}
            </p>
            <Link
              to={link('contact')}
              className="inline-flex items-center gap-3 bg-titanium text-eerie px-9 py-5 rounded-full text-[11px] uppercase tracking-[0.2em] font-semibold group hover:gap-5 transition-all active:scale-95"
            >
              {t.common.requestQuote}
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
