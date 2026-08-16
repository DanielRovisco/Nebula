import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Check, ChevronDown } from 'lucide-react'
import Reveal from '../lib/Reveal'
import Picture from '../lib/Picture'
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
    image: 'forest-bride',
    alt: 'Noiva em vestido longo entre árvores',
    imgPos: 'object-top',
    packs: [
      { name: 'essencia', items: ['photoEditorial', 'privateGallery', 'sneakPeek'] },
      { name: 'origem', items: ['photoVideo4k', 'privateGallery', 'sneakPeek', 'preWedding'] },
      { name: 'nebula', items: ['photoVideo4k', 'drone', 'preWedding', 'privateGallery', 'sneakPeek'] },
    ],
  },
  {
    id: 'maternidade',
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
    id: 'eventos',
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
  // Vindo de um cartão da página inicial (/servicos#maternidade), abre logo essa
  // categoria em vez da primeira.
  const [open, setOpen] = useState<string>(() => categoriaDoHash(hash) ?? 'casamentos')
  const refs = useRef<Record<string, HTMLDivElement | null>>({})

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
      const el = refs.current[id]
      if (!el) return
      const topo = el.getBoundingClientRect().top + window.scrollY - 96
      window.scrollTo({ top: Math.max(0, topo), behavior: 'smooth' })
    }, 150)
    return () => clearTimeout(t)
  }, [hash])

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

      {/* Accordion */}
      <section className="container-px">
        <div className="border border-white/10 rounded-2xl overflow-hidden">
          {CATEGORIES.map((cat, idx) => {
            const isOpen = open === cat.id
            return (
              <div
                key={cat.id}
                id={cat.id}
                ref={(el) => {
                  refs.current[cat.id] = el
                }}
                className={`bg-eerie${idx > 0 ? ' border-t border-white/10' : ''}`}
              >
                {/* Trigger */}
                <button
                  onClick={() => setOpen(isOpen ? '' : cat.id)}
                  className="w-full flex items-center justify-between py-6 sm:py-9 px-6 sm:px-10 text-left group active:bg-white/[0.02]"
                >
                  <div className="flex items-center gap-5 sm:gap-10 min-w-0">
                    <span className="font-mono text-xs text-titanium/25 tracking-[0.25em] hidden sm:block">
                      0{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <h2
                        className="group-hover:translate-x-1 transition-transform duration-300"
                        style={{ fontSize: 'clamp(1.2rem, 2.8vw, 2.2rem)' }}
                      >
                        {t.home.services[cat.id].title}
                      </h2>
                      <p className="text-titanium/45 text-xs sm:text-sm mt-1">
                        {t.home.services[cat.id].tagline}
                      </p>
                    </div>
                  </div>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="shrink-0 ml-4 text-titanium/50"
                  >
                    <ChevronDown size={20} />
                  </motion.span>
                </button>

                {/* Panel */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 sm:px-10 pb-8 sm:pb-10">
                        {/* Image */}
                        <Picture
                          name={cat.image}
                          alt={cat.alt}
                          sizes="(max-width: 1024px) 100vw, 900px"
                          className={`w-full h-52 sm:h-64 rounded-xl object-cover ${cat.imgPos} mb-6 sm:mb-8`}
                        />
                        {/* Pack cards */}
                        <div
                          className={`grid gap-4 ${
                            cat.packs.length === 2
                              ? 'sm:grid-cols-2'
                              : 'sm:grid-cols-2 lg:grid-cols-3'
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
                          Quem acaba de ler o que está incluído quer ver como
                          fica — e o portfólio abre já filtrado por esta
                          categoria, em vez de o obrigar a procurar o filtro.
                        */}
                        <Link
                          to={`${link('portfolio')}#${cat.id}`}
                          className="mt-6 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-titanium/50 border-b border-titanium/25 pb-1 hover:border-titanium/60 hover:text-titanium/80 transition-all"
                        >
                          {t.services.seeWork} <ArrowRight size={12} />
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
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
