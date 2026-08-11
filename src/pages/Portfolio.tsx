import { useState } from 'react'
import { motion } from 'framer-motion'
import Reveal from '../lib/Reveal'

const FILTERS = ['Todos', 'Casamentos', 'Maternidade', 'Eventos'] as const

type Filter = typeof FILTERS[number]

const ITEMS: {
  src: string
  category: Filter
  tall?: boolean
  pos: string
}[] = [
  { src: '/brand/portfolio/palace-dome.jpg', category: 'Casamentos', tall: true, pos: 'center center' },
  { src: '/brand/portfolio/forest-bride.jpg', category: 'Casamentos', pos: 'center 20%' },
  { src: '/brand/portfolio/hero-beach-dress.jpg', category: 'Casamentos', pos: 'center 25%' },
  { src: '/brand/portfolio/gender-reveal-beach.jpg', category: 'Maternidade', pos: 'center center' },
  { src: '/brand/portfolio/maternity-railway.jpg', category: 'Maternidade', tall: true, pos: 'center center' },
  { src: '/brand/portfolio/maternity-sunset-couple.jpg', category: 'Maternidade', pos: 'center 30%' },
  { src: '/brand/portfolio/baby-balloons.jpg', category: 'Eventos', pos: 'center 15%' },
  { src: '/brand/portfolio/editorial-studio-1.jpg', category: 'Eventos', pos: 'center center' },
  { src: '/brand/portfolio/editorial-dramatic.jpg', category: 'Eventos', tall: true, pos: 'center 20%' },
  { src: '/brand/portfolio/editorial-blue-dress.jpg', category: 'Eventos', pos: 'center 15%' },
  { src: '/brand/portfolio/editorial-purple.jpg', category: 'Eventos', pos: 'center 20%' },
  { src: '/brand/portfolio/editorial-lake.jpg', category: 'Eventos', pos: 'center center' },
  { src: '/brand/portfolio/editorial-studio-2.jpg', category: 'Eventos', pos: 'center 25%' },
  { src: '/brand/portfolio/editorial-autumn.jpg', category: 'Casamentos', pos: 'center 30%' },
]

export default function Portfolio() {
  const [filter, setFilter] = useState<Filter>('Todos')

  const filtered = filter === 'Todos' ? ITEMS : ITEMS.filter((i) => i.category === filter)

  return (
    <div className="pt-28 sm:pt-36 pb-20 sm:pb-28">
      <section className="container-px mb-10 sm:mb-14">
        <Reveal>
          <span className="label-sm">Portfólio</span>
          <h1 className="mt-4 max-w-3xl leading-[1.05]" style={{ fontSize: 'clamp(2.2rem, 6vw, 5rem)' }}>
            Cada imagem, um fragmento de história.
          </h1>
        </Reveal>
      </section>

      <section className="container-px mb-8 sm:mb-12 flex gap-2 sm:gap-2.5 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 sm:px-5 py-2.5 rounded-full text-[11px] sm:text-xs uppercase tracking-[0.12em] border transition-all duration-300 active:scale-95 min-h-[42px] ${
              filter === f
                ? 'bg-titanium text-eerie border-titanium'
                : 'border-white/15 text-titanium/60 hover:border-white/40 hover:text-titanium/85'
            }`}
          >
            {f}
          </button>
        ))}
      </section>

      <section className="container-px">
        <motion.div layout className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map((item, i) => (
            <motion.div
              layout
              key={item.src}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: i * 0.035, ease: [0.16, 1, 0.3, 1] }}
              className={`overflow-hidden rounded-xl group${item.tall ? ' sm:row-span-2' : ''}`}
            >
              <div
                className={`relative overflow-hidden ${
                  item.tall ? 'h-[44vh] sm:h-[62vh]' : 'h-[30vh] sm:h-[33vh]'
                }`}
              >
                <img
                  src={item.src}
                  alt={item.category}
                  loading="lazy"
                  style={{ objectPosition: item.pos }}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-eerie/65 via-transparent to-transparent sm:from-eerie/0 sm:group-hover:from-eerie/35 transition-colors duration-500" />
                <span className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 label-sm text-titanium/80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-500">
                  {item.category}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </div>
  )
}
