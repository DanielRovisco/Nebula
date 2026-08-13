import { useEffect, useRef, useState } from 'react'
import { useInView, useReducedMotion } from 'framer-motion'

interface CountUpProps {
  /** Valor final do contador. */
  to: number
  /** Texto colado ao número, ex. o "+" de "20+". */
  suffix?: string
  duration?: number
  className?: string
}

/**
 * Conta de 0 até `to` quando entra no viewport, uma única vez.
 *
 * Com `prefers-reduced-motion` mostra logo o valor final — um número a saltar
 * é movimento como qualquer outro.
 */
export default function CountUp({ to, suffix = '', duration = 1.6, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const reduced = useReducedMotion()
  const [value, setValue] = useState(0)

  // Com movimento reduzido o valor final é derivado no render, sem passar pelo
  // estado — não há animação para correr.
  const shown = reduced ? to : value

  useEffect(() => {
    if (!inView || reduced) return

    let frame = 0
    const start = performance.now()
    // easeOutCubic: arranca depressa e assenta no fim, em vez de parar a seco.
    const ease = (t: number) => 1 - Math.pow(1 - t, 3)

    const tick = (now: number) => {
      const progress = Math.min((now - start) / (duration * 1000), 1)
      setValue(Math.round(ease(progress) * to))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(frame)
  }, [inView, reduced, to, duration])

  return (
    <span ref={ref} className={className}>
      {/*
        O valor final fica sempre no DOM para leitores de ecrã e para quem
        indexa a página; o número a contar é decorativo.
      */}
      <span aria-hidden="true">
        {shown}
        {suffix}
      </span>
      <span className="sr-only">
        {to}
        {suffix}
      </span>
    </span>
  )
}
