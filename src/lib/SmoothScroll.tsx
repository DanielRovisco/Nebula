import { useEffect, type ReactNode } from 'react'
import { useReducedMotion } from 'framer-motion'
import Lenis from 'lenis'

export default function SmoothScroll({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion()

  useEffect(() => {
    // Scroll suave é movimento imposto: quem pediu menos movimento no sistema
    // fica com o scroll nativo do browser.
    if (reduced) return

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })

    let frame = 0
    function raf(time: number) {
      lenis.raf(time)
      frame = requestAnimationFrame(raf)
    }
    frame = requestAnimationFrame(raf)

    return () => {
      // Sem isto o loop de rAF sobrevivia ao unmount e continuava a chamar
      // um Lenis destruído.
      cancelAnimationFrame(frame)
      lenis.destroy()
    }
  }, [reduced])

  return <>{children}</>
}
