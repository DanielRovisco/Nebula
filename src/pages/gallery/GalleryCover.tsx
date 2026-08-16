import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { COVER_FONTS, LOGO_VARIANTS, coverFontSize } from '../../lib/gallery/cover'
import type { GalleryAccess } from '../../lib/gallery/types'
import { useT } from '../../lib/i18n'

interface Props {
  gallery: GalleryAccess['gallery']
  onEnter: () => void
}

/**
 * Ecrã de abertura da galeria: fotografia a ocupar tudo, texto centrado por
 * cima e o logo escolhido. É a primeira coisa que o cliente vê depois da
 * introdução.
 */
export default function GalleryCover({ gallery, onEnter }: Props) {
  const t = useT()
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.12])
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  const font = COVER_FONTS[gallery.coverFont] ?? COVER_FONTS.serif
  const logo = LOGO_VARIANTS[gallery.logoVariant] ?? LOGO_VARIANTS.white
  const texto = gallery.coverTitle?.trim() || gallery.title

  return (
    <section ref={ref} className="relative h-[100svh] overflow-hidden">
      {gallery.coverUrl ? (
        <motion.div style={reduced ? undefined : { scale }} className="absolute inset-0">
          {/*
            Capa em vídeo: sem som, em ciclo e sem controlos — é cenário, não
            conteúdo para ver. Quem pediu menos movimento no sistema recebe o
            primeiro fotograma parado, porque um vídeo em ciclo é exatamente o
            tipo de movimento de que essa preferência trata.
          */}
          {gallery.coverIsVideo ? (
            <video
              src={gallery.coverUrl}
              // Sem `autoPlay` nem `loop` para quem pediu menos movimento: fica
              // o primeiro fotograma parado. Pôr um <img> com o URL de um vídeo
              // dava uma capa em branco, que era o que acontecia antes.
              autoPlay={!reduced}
              loop={!reduced}
              muted
              playsInline
              preload="metadata"
              aria-hidden="true"
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={gallery.coverUrl}
              alt=""
              // É o elemento de LCP desta página: nada de lazy.
              fetchPriority="high"
              className="w-full h-full object-cover"
            />
          )}
        </motion.div>
      ) : (
        <div className="absolute inset-0 bg-gray-dark" />
      )}

      {/* Escurecer o suficiente para o texto se ler sobre qualquer fotografia. */}
      <div className="absolute inset-0 bg-gradient-to-b from-eerie/50 via-eerie/25 to-eerie/80" />

      <motion.div
        style={reduced ? undefined : { opacity: fade }}
        className="absolute inset-0 flex flex-col items-center justify-center text-center container-px"
      >
        {logo.src && (
          <motion.img
            src={logo.src}
            alt="NEBULA"
            width={2795}
            height={2599}
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="h-12 sm:h-16 w-auto mb-10 opacity-90"
          />
        )}

        <div className="overflow-hidden max-w-4xl">
          <motion.h1
            initial={reduced ? false : { y: '108%' }}
            animate={{ y: 0 }}
            transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={`${font.className} leading-[1.1]`}
            style={{ fontSize: coverFontSize(gallery.coverFont) }}
          >
            {texto}
          </motion.h1>
        </div>

        {gallery.clientName && (
          <motion.p
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.1 }}
            className="label-sm mt-7"
          >
            {gallery.clientName}
          </motion.p>
        )}
      </motion.div>

      <motion.button
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.6 }}
        onClick={onEnter}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 px-6 py-3"
      >
        <span className="label-sm">{t.gallery.viewGallery}</span>
        <motion.span
          animate={reduced ? undefined : { y: [0, 7, 0] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          className="w-px h-8 bg-gradient-to-b from-titanium/60 to-transparent"
        />
      </motion.button>
    </section>
  )
}
