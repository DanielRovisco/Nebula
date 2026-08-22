import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

interface RevealProps {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
  /**
   * Para cópias que existem só por razões de desenho — a segunda passagem de
   * uma faixa que anda em ciclo. Sem isto, quem ouve a página ouve tudo duas
   * vezes seguidas.
   */
  'aria-hidden'?: boolean
}

export default function Reveal({
  children,
  delay = 0,
  y = 40,
  className,
  'aria-hidden': ariaHidden,
}: RevealProps) {
  const reduced = useReducedMotion()

  // Com movimento reduzido o conteúdo é entregue já visível, sem transição.
  if (reduced) return <div className={className} aria-hidden={ariaHidden}>{children}</div>

  return (
    <motion.div
      className={className}
      aria-hidden={ariaHidden}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}
