import { useRef, type ReactNode } from 'react'
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'

/**
 * Movimento ligado ao scroll: o conteúdo anda mais devagar do que a página.
 *
 * Serve para dar profundidade sem animação nenhuma a disparar: não há entrada
 * nem saída, há uma coisa que se mexe enquanto se rola, e é isso que faz a
 * página parecer ter camadas em vez de ser uma folha a subir.
 *
 * O valor passa por uma mola antes de chegar ao transform. Sem ela, o
 * movimento é exactamente proporcional ao scroll e num rato de roda, que salta
 * de cem em cem pixels, salta com ele. Com a mola, arrasta-se atrás.
 *
 * `offset` mede do momento em que o topo do elemento entra por baixo do ecrã
 * até o fundo dele sair por cima: é a travessia toda, e é por isso que o
 * movimento nunca acaba antes de a coisa sair da vista.
 */
export default function Paralaxe({
  children,
  quanto = 40,
  rodar = 0,
  className,
}: {
  children: ReactNode
  /** Pixels percorridos do princípio ao fim da travessia. */
  quanto?: number
  /** Graus rodados ao longo da mesma travessia, à volta do valor em repouso. */
  rodar?: number
  className?: string
}) {
  const reduzido = useReducedMotion()
  const ref = useRef<HTMLDivElement | null>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const suave = useSpring(scrollYProgress, { stiffness: 90, damping: 26, mass: 0.6 })
  const y = useTransform(suave, [0, 1], [quanto, -quanto])
  const rotate = useTransform(suave, [0, 1], [rodar, -rodar])

  if (reduzido) return <div className={className}>{children}</div>

  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y, rotate }}>{children}</motion.div>
    </div>
  )
}
