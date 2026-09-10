import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Play, X } from 'lucide-react'
import type { MediaEvento } from '../../lib/evento/api'

/**
 * O que toda a gente deixou.
 *
 * É a parte da página que os convidados não esperam encontrar, e a que os faz
 * ficar: chegaram para entregar três fotografias e descobrem o casamento
 * inteiro visto por cem pessoas diferentes.
 */
export default function Galeria({ media }: { media: MediaEvento[] }) {
  const reduzido = useReducedMotion()
  const [aberta, setAberta] = useState<number | null>(null)

  if (media.length === 0) return null

  return (
    <section className="mt-16">
      <span className="label-sm">
        {media.length === 1 ? 'Um momento' : `${media.length} momentos`}
      </span>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
        {media.map((m, i) => (
          <motion.button
            key={m.id}
            onClick={() => setAberta(i)}
            initial={reduzido ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{
              duration: 0.5,
              delay: reduzido ? 0 : Math.min((i % 9) * 0.05, 0.4),
              ease: [0.16, 1, 0.3, 1],
            }}
            className="group relative aspect-square rounded-xl overflow-hidden bg-white/[0.05]"
          >
            <img
              src={m.thumbUrl ?? m.url}
              alt={m.name ? `Fotografia de ${m.name}` : 'Fotografia do casamento'}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
            />
            {m.kind === 'video' && (
              <span aria-hidden className="absolute top-2 left-2 text-titanium/85 drop-shadow">
                <Play size={14} />
              </span>
            )}
            {m.name && (
              <span className="pointer-events-none absolute bottom-0 inset-x-0 px-2 py-1.5 text-[10px] truncate bg-gradient-to-t from-eerie/85 to-transparent text-titanium/80">
                {m.name}
              </span>
            )}
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {aberta !== null && media[aberta] && (
          <EmGrande
            item={media[aberta]}
            indice={aberta}
            total={media.length}
            aoFechar={() => setAberta(null)}
            aoMover={(d) => setAberta((i) => ((i ?? 0) + d + media.length) % media.length)}
          />
        )}
      </AnimatePresence>
    </section>
  )
}

function EmGrande({
  item, indice, total, aoFechar, aoMover,
}: {
  item: MediaEvento
  indice: number
  total: number
  aoFechar: () => void
  aoMover: (d: number) => void
}) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar()
      if (e.key === 'ArrowLeft') aoMover(-1)
      if (e.key === 'ArrowRight') aoMover(1)
    }
    document.addEventListener('keydown', tecla)
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', tecla)
      document.body.style.overflow = antes
    }
  }, [aoFechar, aoMover])

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[100] bg-eerie flex flex-col"
    >
      <header className="flex items-center gap-3 px-4 h-16 shrink-0">
        <button onClick={aoFechar} aria-label="Fechar" className={ICONE}>
          <X size={20} />
        </button>
        <div className="flex-1 min-w-0 text-center">
          {item.name && <p className="text-sm text-titanium/70 truncate">de {item.name}</p>}
          <p className="text-[0.65rem] uppercase tracking-[0.2em] text-titanium/30 mt-0.5">
            {indice + 1} de {total}
          </p>
        </div>
        <span className="w-11 shrink-0" />
      </header>

      <div className="flex-1 min-h-0 relative flex items-center justify-center px-2 pb-6">
        {total > 1 && (
          <button onClick={() => aoMover(-1)} aria-label="Anterior" className={`${SETA} left-1 sm:left-4`}>
            <ChevronLeft size={22} />
          </button>
        )}

        {/* A `key` faz a imagem entrar de novo a cada mudança, em vez de a
            anterior ficar no sítio enquanto a seguinte carrega. */}
        <motion.div
          key={item.id}
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="max-h-full max-w-full flex items-center justify-center"
        >
          {item.kind === 'video' ? (
            <video src={item.url} controls autoPlay playsInline className="max-h-full max-w-full rounded-lg" />
          ) : (
            <img
              src={item.url}
              alt={item.name ? `Fotografia de ${item.name}` : 'Fotografia do casamento'}
              className="max-h-full max-w-full object-contain rounded-lg"
            />
          )}
        </motion.div>

        {total > 1 && (
          <button onClick={() => aoMover(1)} aria-label="Seguinte" className={`${SETA} right-1 sm:right-4`}>
            <ChevronRight size={22} />
          </button>
        )}
      </div>
    </motion.div>,
    document.body,
  )
}

const ICONE =
  'w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-titanium/55 hover:text-titanium hover:bg-white/[0.07] transition-colors'

const SETA =
  'absolute top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-titanium/45 hover:text-titanium hover:bg-white/[0.07] transition-colors z-10'
