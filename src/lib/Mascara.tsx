import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

/**
 * Texto que sobe de trás de uma máscara quando entra no ecrã.
 *
 * É o mesmo movimento que a página do convidado usa no nome dos noivos, e o
 * que faz um título parecer entrar em cena em vez de aparecer de repente. Só
 * serve para títulos: numa linha de texto corrido a máscara corta as letras a
 * meio enquanto sobe e o efeito lê-se como um defeito de renderização.
 *
 * O `overflow-hidden` corta o que passa da caixa, e as letras com cauda (g, p,
 * ç) passam. Daí o espaço extra por baixo, devolvido logo a seguir com a
 * margem negativa: a máscara ganha altura, o texto não muda de sítio.
 */
export default function Mascara({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const reduzido = useReducedMotion()

  if (reduzido) return <span className={`block ${className ?? ''}`}>{children}</span>

  return (
    <span className={`block overflow-hidden pb-[0.14em] -mb-[0.14em] ${className ?? ''}`}>
      <motion.span
        className="block"
        initial={{ y: '115%' }}
        whileInView={{ y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 1.1, delay, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.span>
    </span>
  )
}
