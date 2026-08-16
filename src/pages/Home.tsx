import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { useCallback, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import Reveal from '../lib/Reveal'
import Picture from '../lib/Picture'
import CountUp from '../lib/CountUp'
import Seo from '../lib/Seo'
import SiteIntro from '../components/SiteIntro'
import { useLink, useT } from '../lib/i18n'
import { track } from '../lib/track'
import Testimonials from '../components/Testimonials'
import { asset } from '../lib/asset'
import { CONTACT, absoluteUrl } from '../lib/site'
import { businessJsonLd } from '../lib/businessJsonLd'

// O `id` casa com as categorias de /servicos: o cartão abre logo a categoria
// certa no acordeão, em vez de cair sempre na primeira.
const SERVICES = [
  {
    id: 'casamentos',
    image: 'forest-bride',
    alt: 'Noiva em vestido longo entre árvores, fotografia de casamento editorial',
    imgPos: 'object-top',
  },
  {
    id: 'maternidade',
    image: 'maternity-railway',
    alt: 'Sessão de maternidade ao ar livre junto a uma linha de ferro',
    imgPos: 'object-center',
  },
  {
    id: 'eventos',
    image: 'baby-balloons',
    alt: 'Bebé rodeado de balões durante uma festa de família',
    imgPos: 'object-[50%_15%]',
  },
] as const

const GALLERY = [
  { name: 'palace-dome', alt: 'Cúpula de palácio fotografada de baixo durante um casamento', pos: 'center center' },
  { name: 'editorial-dramatic', alt: 'Retrato editorial com iluminação dramática', pos: 'center 20%' },
  { name: 'maternity-sunset-couple', alt: 'Casal à espera de bebé ao pôr do sol', pos: 'center 30%' },
  { name: 'hero-beach-dress', alt: 'Vestido a esvoaçar numa praia ao final do dia', pos: 'center 25%' },
  { name: 'editorial-blue-dress', alt: 'Retrato editorial de vestido azul', pos: 'center 15%' },
]

// Só o que não é texto: os números dos passos, os valores das estatísticas e
// o atraso de cada linha do título. As palavras vêm do dicionário da língua.
const STEP_NUMBERS = ['01', '02', '03']
const HEADLINE_DELAYS = [0.3, 0.46, 0.62]

/** Os números não se traduzem; as legendas sim. */
const STATS = [
  { value: '20+', countTo: 20, suffix: '+', key: 'stories' },
  { value: '3', key: 'creators' },
  { value: '360°', key: 'allRound' },
] as const

/** A abertura aparece uma vez por sessão, não a cada visita à página inicial. */
const INTRO_KEY = 'nebula-intro-site'

export default function Home() {
  const t = useT()
  const link = useLink()
  const reduced = useReducedMotion()
  const heroRef = useRef<HTMLDivElement>(null)

  const [showIntro, setShowIntro] = useState(() => {
    try {
      return !sessionStorage.getItem(INTRO_KEY)
    } catch {
      // Sem sessionStorage (modo privado antigo, políticas apertadas) mostramos
      // a abertura — repetida é melhor do que rebentar a página inicial.
      return true
    }
  })

  const endIntro = useCallback(() => {
    try {
      sessionStorage.setItem(INTRO_KEY, '1')
    } catch { /* sem sessionStorage a abertura repete-se; não é grave */ }
    setShowIntro(false)
  }, [])

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const imgScale = useTransform(scrollYProgress, [0, 1], [1, 1.18])
  const textOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0])
  const textY = useTransform(scrollYProgress, [0, 0.55], [0, 90])

  return (
    <div>
      <AnimatePresence>
        {showIntro && <SiteIntro key="intro" onDone={endIntro} />}
      </AnimatePresence>

      <Seo
        title={t.home.seoTitle}
        description={t.home.seoDescription}
        image={absoluteUrl('/brand/portfolio/hero-beach-dress-1440.webp')}
        jsonLd={businessJsonLd}
      />

      {/* ── HERO ─────────────────────────────────────── */}
      <section ref={heroRef} className="relative h-[100svh] overflow-hidden">
        <motion.div
          style={reduced ? undefined : { scale: imgScale }}
          className="absolute inset-0 origin-center"
        >
          <Picture
            name="hero-beach-dress"
            alt="Vestido de noiva a esvoaçar numa praia ao final do dia — fotografia editorial NEBULA"
            sizes="100vw"
            priority
            className="w-full h-full object-cover object-[50%_25%]"
          />
        </motion.div>

        <div className="absolute inset-0 bg-gradient-to-t from-eerie via-eerie/35 to-eerie/10" />
        <div className="absolute inset-0 bg-eerie/20" />

        <motion.div
          style={reduced ? undefined : { opacity: textOpacity, y: textY }}
          className="absolute inset-0 flex flex-col justify-end container-px pb-14 sm:pb-24"
        >
          {/*
            `initial={false}` com movimento reduzido, tal como no Reveal: sem
            isto a opacidade ficava em 0 e o crachá, o botão e o indicador de
            scroll do hero ficavam invisíveis para quem tem essa preferência
            ativa — apanhado ao pré-renderizar as páginas.
          */}
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex items-center gap-3 mb-7 sm:mb-9"
          >
            <img src={asset('/brand/logo-symbol-white.png')} alt="" width={1252} height={1494} className="h-5 sm:h-6 w-auto opacity-80" />
            <span className="label-sm">{t.home.place}</span>
          </motion.div>

          {/* h1 real em vez de role="heading" — é o único da página. */}
          <h1 className="text-[12vw] sm:text-[8vw] md:text-[6vw] font-semibold tracking-tight">
            {t.home.headline.map((text, i) => (
              <span key={text} className="block overflow-hidden" style={{ lineHeight: 0.93 }}>
                <motion.span
                  className="block"
                  initial={reduced ? false : { y: '108%' }}
                  animate={{ y: 0 }}
                  transition={{ duration: 1, delay: HEADLINE_DELAYS[i], ease: [0.16, 1, 0.3, 1] }}
                >
                  {text}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.0 }}
            className="mt-8 sm:mt-10 flex flex-wrap items-center gap-4 sm:gap-6"
          >
            <Link
              to={link('contact')}
              onClick={() => track('cta_marcar_sessao', { onde: 'hero' })}
              className="inline-flex items-center gap-3 bg-titanium text-eerie px-7 py-4 rounded-full text-[11px] sm:text-xs uppercase tracking-[0.18em] font-semibold group active:scale-95 hover:gap-5 transition-all min-h-[50px]"
            >
              {t.home.heroCta}
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <span className="label-sm opacity-70">{t.home.heroNote}</span>
          </motion.div>
        </motion.div>

        <motion.div
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0"
        >
          <motion.div
            animate={reduced ? undefined : { scaleY: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
            style={{ transformOrigin: 'top' }}
            className="w-px h-14 bg-gradient-to-b from-titanium/50 to-transparent"
          />
        </motion.div>
      </section>

      {/* ── MANIFESTO ──────────────────────────────────── */}
      <section className="py-20 sm:py-36 md:py-44">
        <div className="container-px">
          <Reveal>
            <p
              className="font-serif italic leading-[1.12] text-titanium/92"
              style={{ fontSize: 'clamp(2rem, 5.5vw, 5rem)' }}
            >
              {t.home.manifesto[0]}
            </p>
            <p
              className="font-serif italic leading-[1.12] text-titanium/45 mt-1 sm:mt-2"
              style={{ fontSize: 'clamp(2rem, 5.5vw, 5rem)' }}
            >
              {t.home.manifesto[1]}
            </p>
          </Reveal>
          <Reveal delay={0.22} className="mt-10 sm:mt-14">
            <p className="text-sm text-titanium/50 max-w-sm leading-relaxed">
              Cada projeto é uma narrativa única. Abordamos cada momento com
              criatividade, rigor e autenticidade — sem fórmulas, sem repetições.
            </p>
          </Reveal>
        </div>
      </section>

      <div className="container-px"><div className="hairline" /></div>

      {/* ── SERVIÇOS ───────────────────────────────────── */}
      <section className="py-16 sm:py-28">
        <div className="container-px">
          <Reveal className="mb-10 sm:mb-16">
            <span className="label-sm">{t.home.servicesLabel}</span>
            <h2 className="text-3xl sm:text-5xl mt-3">{t.home.servicesTitle}</h2>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-4 sm:gap-5">
            {SERVICES.map((s, i) => (
              <Reveal key={s.id} delay={i * 0.1}>
                <Link
                  to={`${link('services')}#${s.id}`}
                  className="block relative rounded-2xl overflow-hidden group"
                  style={{ height: 'clamp(48vh, 60vh, 68vh)' }}
                >
                  <Picture
                    name={s.image}
                    alt={s.alt}
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className={`absolute inset-0 w-full h-full object-cover ${s.imgPos} transition-transform duration-[1400ms] group-hover:scale-105`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-eerie/95 via-eerie/25 to-transparent" />

                  <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-7">
                    <span className="font-mono text-[10px] text-titanium/30 tracking-[0.3em] mb-3 block">
                      0{i + 1}
                    </span>
                    <h3
                      className="mb-2 group-hover:tracking-wide transition-[letter-spacing] duration-500"
                      style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)' }}
                    >
                      {t.home.services[s.id].title}
                    </h3>
                    <p className="text-[13px] text-titanium/55 leading-relaxed max-w-[220px]">
                      {t.home.services[s.id].tagline}
                    </p>
                    <div className="flex items-center gap-2 mt-5 label-sm text-titanium/45 group-hover:text-titanium/75 group-hover:gap-3 transition-all duration-300">
                      {t.common.exploreMore}
                      <ArrowRight size={11} />
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.25} className="mt-10 sm:mt-12">
            <Link
              to={link('services')}
              className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-titanium/60 border-b border-titanium/25 pb-1 hover:border-titanium/60 hover:text-titanium/90 transition-all"
            >
              {t.home.servicesLink}
              <ArrowRight size={12} />
            </Link>
          </Reveal>
        </div>
      </section>

      <div className="container-px"><div className="hairline" /></div>

      {/* ── NÚMEROS ─────────────────────────────────────── */}
      <section className="py-10 sm:py-14">
        <div className="container-px">
          <div className="grid grid-cols-3 gap-px bg-white/[0.07] rounded-2xl overflow-hidden">
            {STATS.map((stat) => (
              <div key={stat.key} className="bg-eerie px-3 sm:px-6 py-8 sm:py-10 text-center">
                <Reveal>
                  <div className="text-2xl sm:text-4xl font-semibold tracking-tight">
                    {'countTo' in stat ? (
                      <CountUp to={stat.countTo} suffix={stat.suffix} />
                    ) : (
                      stat.value
                    )}
                  </div>
                  {/*
                    Em colunas de ~100px o tracking de 0.28em do label-sm faz
                    palavras como "conteúdo" rebentarem a largura do card, por
                    isso aperta em ecrãs estreitos e recupera a partir de sm.
                  */}
                  {/*
                    `break-words` garante que nenhuma palavra rebenta a coluna
                    nos ecrãs mais estreitos, onde nem 0.1em de tracking chega.
                  */}
                  <div className="label-sm mt-2.5 block leading-relaxed tracking-[0.1em] break-words hyphens-auto sm:tracking-[0.28em]">
                    {t.home.stats[stat.key]}
                  </div>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="container-px"><div className="hairline" /></div>

      {/* ── GALERIA ─────────────────────────────────────── */}
      <section className="py-16 sm:py-28">
        <div className="container-px mb-10 sm:mb-14 flex items-end justify-between flex-wrap gap-4">
          <Reveal>
            <span className="label-sm">{t.home.galleryLabel}</span>
            <h2 className="text-3xl sm:text-5xl mt-3">{t.home.galleryTitle}</h2>
          </Reveal>
          <Reveal delay={0.15}>
            <Link
              to={link('portfolio')}
              className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-titanium/55 border-b border-titanium/25 pb-1 hover:border-titanium/55 hover:text-titanium/85 transition-all"
            >
              {t.home.galleryLink} <ArrowRight size={12} />
            </Link>
          </Reveal>
        </div>

        <div className="flex gap-3 sm:gap-4 overflow-x-auto px-[clamp(1.25rem,6vw,6rem)] pb-4 snap-x snap-mandatory [scrollbar-width:none] [-webkit-overflow-scrolling:touch]">
          {GALLERY.map((item, i) => (
            <Reveal key={item.name} delay={i * 0.06} className="shrink-0 snap-start">
              <div className="w-[70vw] sm:w-[34vw] md:w-[27vw] overflow-hidden rounded-xl" style={{ height: 'clamp(48vh, 58vh, 65vh)' }}>
                <Picture
                  name={item.name}
                  alt={item.alt}
                  sizes="(max-width: 640px) 70vw, (max-width: 768px) 34vw, 27vw"
                  style={{ objectPosition: item.pos }}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <div className="container-px"><div className="hairline" /></div>

      {/* ── PROCESSO ────────────────────────────────────── */}
      <section className="py-16 sm:py-28">
        <div className="container-px">
          <Reveal className="mb-10 sm:mb-16">
            <span className="label-sm">{t.home.processLabel}</span>
            <h2 className="text-3xl sm:text-5xl mt-3">{t.home.processTitle}</h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-8 sm:gap-12">
            {t.home.steps.map((step, i) => (
              <Reveal key={STEP_NUMBERS[i]} delay={i * 0.12}>
                <div className="border-t border-white/[0.12] pt-6 sm:pt-7">
                  <span className="font-mono text-[11px] text-titanium/25 tracking-[0.3em]">{STEP_NUMBERS[i]}</span>
                  <h3 className="text-xl sm:text-2xl mt-4 mb-3">{step.title}</h3>
                  <p className="text-sm text-titanium/50 leading-relaxed">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTEMUNHOS ─────────────────────────────────── */}
      {/* Só se desenha se houver testemunhos carregados no painel. */}
      <Testimonials />

      {/* ── CTA FINAL ────────────────────────────────────── */}
      <section className="py-20 sm:py-36 md:py-44">
        <div className="container-px text-center">
          <Reveal>
            <h2
              className="leading-[1.05] mb-10"
              style={{ fontSize: 'clamp(2.2rem, 5.5vw, 5.2rem)' }}
            >
              {t.home.ctaTitle[0]}<br className="hidden sm:block" /> {t.home.ctaTitle[1]}
            </h2>
          </Reveal>
          <Reveal delay={0.2} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to={link('contact')}
              onClick={() => track('cta_marcar_sessao', { onde: 'fim' })}
              className="inline-flex items-center gap-3 bg-titanium text-eerie px-9 py-5 rounded-full text-[11px] uppercase tracking-[0.2em] font-semibold group hover:gap-5 transition-all active:scale-95"
            >
              {t.home.ctaButton}
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href={CONTACT.instagramDm}
              target="_blank"
              rel="noreferrer"
              onClick={() => track('cta_instagram', { onde: 'home' })}
              className="inline-flex items-center gap-3 border border-white/20 px-9 py-5 rounded-full text-[11px] uppercase tracking-[0.2em] hover:border-white/45 transition-colors active:scale-95"
            >
              {t.home.ctaInstagram}
            </a>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
