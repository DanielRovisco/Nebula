import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Check, ChevronDown } from 'lucide-react'
import Reveal from '../lib/Reveal'
import Picture from '../lib/Picture'
import Seo from '../lib/Seo'
import { absoluteUrl } from '../lib/site'

const CATEGORIES = [
  {
    id: 'casamentos',
    title: 'Casamentos',
    tagline: 'A vossa história de amor, contada para sempre.',
    image: 'forest-bride',
    alt: 'Noiva em vestido longo entre árvores',
    imgPos: 'object-top',
    packs: [
      {
        name: 'Essência',
        items: ['Fotografia editorial', 'Galeria online privada', 'Sneak Peek em 24h'],
      },
      {
        name: 'Origem',
        items: ['Fotografia + Vídeo 4K', 'Galeria online privada', 'Sneak Peek em 24h', 'Pré-wedding incluído'],
      },
      {
        name: 'Nebula',
        items: ['Fotografia + Vídeo 4K', 'Cobertura com Drone', 'Pré-wedding incluído', 'Galeria online privada', 'Sneak Peek em 24h'],
      },
    ],
  },
  {
    id: 'maternidade',
    title: 'Maternidade',
    tagline: 'Celebrar a espera. Eternizar o início.',
    image: 'maternity-railway',
    alt: 'Sessão de maternidade junto a uma linha de ferro',
    imgPos: 'object-center',
    packs: [
      {
        name: 'Essência',
        items: ['Sessão de fotografia', 'Galeria online privada'],
      },
      {
        name: 'Cinema & Foto',
        items: ['Fotografia + Vídeo lifestyle', 'Galeria online privada', 'Sneak Peek em 24h'],
      },
      {
        name: 'Íntimo',
        items: ['Sessão a dois', 'Fotografia editorial', 'Galeria online privada'],
      },
    ],
  },
  {
    id: 'eventos',
    title: 'Eventos',
    tagline: 'Cobertura à medida de cada ocasião.',
    image: 'baby-balloons',
    alt: 'Bebé rodeado de balões durante uma festa de família',
    imgPos: 'object-[50%_15%]',
    packs: [
      {
        name: 'Foto',
        items: ['Cobertura fotográfica pontual', 'Galeria online privada'],
      },
      {
        name: 'Foto + Vídeo',
        items: ['Cobertura fotográfica e vídeo', 'Galeria online privada', 'Sneak Peek em 24h'],
      },
    ],
  },
]

/** Só abrimos a categoria pedida se ela existir — o hash vem do URL. */
function categoriaDoHash(hash: string) {
  const id = decodeURIComponent(hash.replace('#', ''))
  return CATEGORIES.some((c) => c.id === id) ? id : null
}

export default function Services() {
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
        title="Serviços & Packs — NEBULA Fotografia & Vídeo"
        description="Packs de fotografia e vídeo para casamentos, maternidade e eventos: vídeo 4K, drone, pré-wedding, galeria online privada e sneak peek em 24h."
        image={absoluteUrl('/brand/portfolio/forest-bride-1440.webp')}
      />

      {/* Header */}
      <section className="container-px mb-12 sm:mb-24">
        <Reveal>
          <span className="label-sm">Serviços</span>
          <h1 className="mt-4 max-w-3xl leading-[1.05]" style={{ fontSize: 'clamp(2.2rem, 6vw, 5rem)' }}>
            Narrativa e experiência, não apenas horas de serviço.
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
                        {cat.title}
                      </h2>
                      <p className="text-titanium/45 text-xs sm:text-sm mt-1">{cat.tagline}</p>
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
                              <h3 className="text-base sm:text-lg mb-4">{pack.name}</h3>
                              <ul className="space-y-2.5 flex-1">
                                {pack.items.map((item) => (
                                  <li key={item} className="flex items-start gap-2.5 text-sm text-titanium/55">
                                    <Check size={13} className="mt-0.5 shrink-0 text-titanium/70" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                              <Link
                                to="/contacto"
                                className="mt-6 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-titanium/50 border-b border-titanium/25 pb-1 hover:border-titanium/60 hover:text-titanium/80 transition-all w-fit min-h-[44px]"
                              >
                                Pedir proposta <ArrowRight size={12} />
                              </Link>
                            </div>
                          ))}
                        </div>
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
            <span className="label-sm">Adicional</span>
            <h2 className="text-2xl sm:text-4xl mt-4 mb-5">Vídeo 4K em qualquer pack</h2>
            <p className="text-titanium/55 max-w-md mx-auto text-sm leading-relaxed mb-8">
              Em qualquer pack, podes adicionar filmagem cinematográfica em 4K para
              uma narrativa ainda mais completa — fotografia e movimento, lado a lado.
            </p>
            <Link
              to="/contacto"
              className="inline-flex items-center gap-3 bg-titanium text-eerie px-9 py-5 rounded-full text-[11px] uppercase tracking-[0.2em] font-semibold group hover:gap-5 transition-all active:scale-95"
            >
              Pedir orçamento
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
