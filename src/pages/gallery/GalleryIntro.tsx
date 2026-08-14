import { useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { asset } from '../../lib/asset'

const EASE = [0.16, 1, 0.3, 1] as const

interface Props {
  clientName: string | null
  title: string
  onDone: () => void
}

/**
 * Boas-vindas antes da galeria abrir: o símbolo aparece, uma linha desenha-se e
 * o nome do cliente surge, tudo sobre preto. Dura ~3,4s e sai sozinha —
 * o suficiente para ser um gesto, sem pôr ninguém à espera das suas fotos.
 *
 * Aparece uma vez por sessão (ver INTRO_KEY em GalleryView) — repeti-la a cada
 * refresh passaria de encantador a irritante — e é saltada por inteiro com
 * `prefers-reduced-motion`.
 */
export default function GalleryIntro({ clientName, title, onDone }: Props) {
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) {
      onDone()
      return
    }
    const t = setTimeout(onDone, 3400)
    return () => clearTimeout(t)
  }, [reduced, onDone])

  // Sem intro, não há nada para desenhar.
  if (reduced) return null

  const saudacao = clientName ? clientName.split(' ')[0] : null

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.9, ease: EASE }}
      className="fixed inset-0 z-[200] bg-eerie flex flex-col items-center justify-center px-8"
      // Permite saltar a introdução a quem já a viu e não quer esperar.
      onClick={onDone}
      role="presentation"
    >
      <motion.img
        src={asset('/brand/logo-symbol-white.png')}
        alt=""
        width={1252}
        height={1494}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 0.9, scale: 1 }}
        transition={{ duration: 1.4, ease: EASE }}
        className="h-12 sm:h-14 w-auto"
      />

      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.1, delay: 0.9, ease: EASE }}
        className="w-24 sm:w-32 h-px bg-titanium/30 my-8 origin-center"
      />

      <div className="overflow-hidden">
        <motion.p
          initial={{ y: '110%' }}
          animate={{ y: 0 }}
          transition={{ duration: 1, delay: 1.5, ease: EASE }}
          className="label-sm text-center"
        >
          {saudacao ? `Bem-vindos, ${saudacao}` : 'Bem-vindos'}
        </motion.p>
      </div>

      <div className="overflow-hidden mt-4">
        <motion.p
          initial={{ y: '110%' }}
          animate={{ y: 0 }}
          transition={{ duration: 0.9, delay: 1.7, ease: EASE }}
          className="font-serif italic text-center text-titanium/90"
          style={{ fontSize: 'clamp(1.6rem, 5vw, 3rem)', lineHeight: 1.15 }}
        >
          {title}
        </motion.p>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 2.5 }}
        className="label-sm mt-12 text-titanium/25"
      >
        Toquem para avançar
      </motion.p>
    </motion.div>
  )
}
