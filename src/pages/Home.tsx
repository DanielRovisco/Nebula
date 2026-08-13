import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'
import { ArrowRight } from 'lucide-react'
import Reveal from '../lib/Reveal'
import Picture from '../lib/Picture'
import CountUp from '../lib/CountUp'
import Seo from '../lib/Seo'
import { asset } from '../lib/asset'
import { CONTACT, absoluteUrl } from '../lib/site'

const SERVICES = [
  {
    title: 'Casamentos',
    tagline: 'A vossa história de amor, contada para sempre.',
    image: 'forest-bride',
    alt: 'Noiva em vestido longo entre árvores, fotografia de casamento editorial',
    imgPos: 'object-top',
  },
  {
    title: 'Maternidade',
    tagline: 'Celebrar a espera. Eternizar o início.',
    image: 'maternity-railway',
    alt: 'Sessão de maternidade ao ar livre junto a uma linha de ferro',
    imgPos: 'object-center',
  },
  {
    title: 'Eventos',
    tagline: 'Coberturas à medida de cada ocasião.',
    image: 'baby-balloons',
    alt: 'Bebé rodeado de balões durante uma festa de família',
    imgPos: 'object-[50%_15%]',
  },
]

const STATS: { value: string; countTo?: number; suffix?: string; label: string }[] = [
  { value: '20+', countTo: 20, suffix: '+', label: 'Histórias contadas' },
  { value: '3', label: 'Criadores visuais' },
  { value: '4K', label: 'Vídeo cinematográfico' },
]

const GALLERY = [
  { name: 'palace-dome', alt: 'Cúpula de palácio fotografada de baixo durante um casamento', pos: 'center center' },
  { name: 'editorial-dramatic', alt: 'Retrato editorial com iluminação dramática', pos: 'center 20%' },
  { name: 'maternity-sunset-couple', alt: 'Casal à espera de bebé ao pôr do sol', pos: 'center 30%' },
  { name: 'hero-beach-dress', alt: 'Vestido a esvoaçar numa praia ao final do dia', pos: 'center 25%' },
  { name: 'editorial-blue-dress', alt: 'Retrato editorial de vestido azul', pos: 'center 15%' },
]

const STEPS = [
  {
    n: '01',
    title: 'Primeiro contacto',
    desc: 'Envie-nos uma mensagem pelo Instagram ou email. Respondemos em menos de 24 horas.',
  },
  {
    n: '02',
    title: 'A vossa sessão',
    desc: 'No local que escolherem, com toda a atenção ao detalhe, à luz e às emoções do momento.',
  },
  {
    n: '03',
    title: 'Entrega da galeria',
    desc: 'Galeria online privada com todas as imagens editadas. Sneak peek em 24h após a sessão.',
  },
]

const HEADLINE = [
  { text: 'Histórias', delay: 0.3 },
  { text: 'que nascem', delay: 0.46 },
  { text: 'em luz.', delay: 0.62 },
]

export default function Home() {
  const reduced = useReducedMotion()
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const imgScale = useTransform(scrollYProgress, [0, 1], [1, 1.18])
  const textOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0])
  const textY = useTransform(scrollYProgress, [0, 0.55], [0, 90])

  return (
    <div>
      <Seo
        title="NEBULA — Fotografia & Vídeo Cinematográfico em Lisboa"
        description="Fotógrafo e videógrafo para casamentos, maternidade e eventos em Lisboa e Portalegre. Fotografia editorial e vídeo cinematográfico 4K."
        image={absoluteUrl('/brand/portfolio/hero-beach-dress-1440.webp')}
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
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex items-center gap-3 mb-7 sm:mb-9"
          >
            <img src={asset('/brand/logo-symbol-white.png')} alt="" width={1252} height={1494} className="h-5 sm:h-6 w-auto opacity-80" />
            <span className="label-sm">Lisboa & Portalegre</span>
          </motion.div>

          {/* h1 real em vez de role="heading" — é o único da página. */}
          <h1 className="text-[12vw] sm:text-[8vw] md:text-[6vw] font-semibold tracking-tight">
            {HEADLINE.map(({ text, delay }) => (
              <span key={text} className="block overflow-hidden" style={{ lineHeight: 0.93 }}>
                <motion.span
                  className="block"
                  initial={reduced ? false : { y: '108%' }}
                  animate={{ y: 0 }}
                  transition={{ duration: 1, delay, ease: [0.16, 1, 0.3, 1] }}
                >
                  {text}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.0 }}
            className="mt-8 sm:mt-10 flex flex-wrap items-center gap-4 sm:gap-6"
          >
            <Link
              to="/contacto"
              className="inline-flex items-center gap-3 bg-titanium text-eerie px-7 py-4 rounded-full text-[11px] sm:text-xs uppercase tracking-[0.18em] font-semibold group active:scale-95 hover:gap-5 transition-all min-h-[50px]"
            >
              Marcar Sessão
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <span className="label-sm opacity-70">Datas 2026 disponíveis</span>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
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
              "Não fotografamos momentos.
            </p>
            <p
              className="font-serif italic leading-[1.12] text-titanium/45 mt-1 sm:mt-2"
              style={{ fontSize: 'clamp(2rem, 5.5vw, 5rem)' }}
            >
              Eternizamos sentimentos."
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
            <span className="label-sm">O que fazemos</span>
            <h2 className="text-3xl sm:text-5xl mt-3">Os nossos serviços</h2>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-4 sm:gap-5">
            {SERVICES.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.1}>
                <Link
                  to="/servicos"
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
                      {s.title}
                    </h3>
                    <p className="text-[13px] text-titanium/55 leading-relaxed max-w-[220px]">
                      {s.tagline}
                    </p>
                    <div className="flex items-center gap-2 mt-5 label-sm text-titanium/45 group-hover:text-titanium/75 group-hover:gap-3 transition-all duration-300">
                      Explorar
                      <ArrowRight size={11} />
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.25} className="mt-10 sm:mt-12">
            <Link
              to="/servicos"
              className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-titanium/60 border-b border-titanium/25 pb-1 hover:border-titanium/60 hover:text-titanium/90 transition-all"
            >
              Ver todos os serviços & preços
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
              <div key={stat.label} className="bg-eerie px-3 sm:px-6 py-8 sm:py-10 text-center">
                <Reveal>
                  <div className="text-2xl sm:text-4xl font-semibold tracking-tight">
                    {stat.countTo !== undefined ? (
                      <CountUp to={stat.countTo} suffix={stat.suffix} />
                    ) : (
                      stat.value
                    )}
                  </div>
                  <div className="label-sm mt-2.5 block leading-relaxed">{stat.label}</div>
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
            <span className="label-sm">Portfólio</span>
            <h2 className="text-3xl sm:text-5xl mt-3">Momentos capturados</h2>
          </Reveal>
          <Reveal delay={0.15}>
            <Link
              to="/portfolio"
              className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-titanium/55 border-b border-titanium/25 pb-1 hover:border-titanium/55 hover:text-titanium/85 transition-all"
            >
              Galeria completa <ArrowRight size={12} />
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
            <span className="label-sm">Como funciona</span>
            <h2 className="text-3xl sm:text-5xl mt-3">Simples, do início ao fim</h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-8 sm:gap-12">
            {STEPS.map((step, i) => (
              <Reveal key={step.n} delay={i * 0.12}>
                <div className="border-t border-white/[0.12] pt-6 sm:pt-7">
                  <span className="font-mono text-[11px] text-titanium/25 tracking-[0.3em]">{step.n}</span>
                  <h3 className="text-xl sm:text-2xl mt-4 mb-3">{step.title}</h3>
                  <p className="text-sm text-titanium/50 leading-relaxed">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────── */}
      <section className="py-20 sm:py-36 md:py-44">
        <div className="container-px text-center">
          <Reveal>
            <h2
              className="leading-[1.05] mb-10"
              style={{ fontSize: 'clamp(2.2rem, 5.5vw, 5.2rem)' }}
            >
              Vamos contar<br className="hidden sm:block" /> a vossa história?
            </h2>
          </Reveal>
          <Reveal delay={0.2} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/contacto"
              className="inline-flex items-center gap-3 bg-titanium text-eerie px-9 py-5 rounded-full text-[11px] uppercase tracking-[0.2em] font-semibold group hover:gap-5 transition-all active:scale-95"
            >
              Fala connosco
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href={CONTACT.instagramDm}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-3 border border-white/20 px-9 py-5 rounded-full text-[11px] uppercase tracking-[0.2em] hover:border-white/45 transition-colors active:scale-95"
            >
              Instagram DM
            </a>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
