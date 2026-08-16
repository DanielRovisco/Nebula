import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { asset } from '../lib/asset'

const EASE = [0.16, 1, 0.3, 1] as const

/**
 * Abertura do site: o símbolo aparece, uma linha desenha-se por baixo e a
 * cortina sobe para o hero.
 *
 * Dura 1,9s — deliberadamente menos de metade da introdução das galerias. Ali o
 * cliente está a receber as fotografias dele e o gesto justifica-se; aqui está
 * alguém que talvez nos esteja a ver pela primeira vez, e fazer essa pessoa
 * esperar é a melhor maneira de a perder. Aparece uma vez por sessão, sai a um
 * toque, e quem pediu menos movimento no sistema não a vê de todo.
 */
export default function SiteIntro({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) {
      onDone()
      return
    }
    const t = setTimeout(onDone, 1900)
    return () => clearTimeout(t)
  }, [reduced, onDone])

  if (reduced) return null

  // Portal para o <body>: dentro da página, a transição de rota do framer põe
  // opacidade no contentor durante a animação, e isso cria um contexto de
  // empilhamento — a abertura ficava presa lá dentro e a barra de navegação
  // aparecia-lhe por cima, com dois logos NEBULA no mesmo ecrã.
  return createPortal(
    <motion.div
      initial={{ opacity: 1 }}
      // Sobe em vez de desvanecer: a cortina abre e o hero já lá está por baixo.
      exit={{ y: '-100%' }}
      transition={{ duration: 0.9, ease: EASE }}
      className="fixed inset-0 z-[200] bg-eerie flex flex-col items-center justify-center"
      onClick={onDone}
      role="presentation"
    >
      {/*
        O lettering, não o símbolo: a introdução das galerias usa o símbolo
        porque ali o cliente já sabe onde está, mas a quem chega ao site pela
        primeira vez a abertura tem de dizer o nome. O símbolo sozinho, num ecrã
        preto inteiro, lê-se como uma marca pequena e perdida.
      */}
      <motion.img
        src={asset('/brand/logo-lettering-white.png')}
        alt=""
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 0.95, scale: 1 }}
        transition={{ duration: 1.2, ease: EASE }}
        className="h-8 sm:h-11 w-auto"
      />

      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1, delay: 0.5, ease: EASE }}
        className="w-20 sm:w-28 h-px bg-titanium/25 mt-7 origin-center"
      />
    </motion.div>,
    document.body,
  )
}
