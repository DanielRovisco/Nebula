import { useScroll, useSpring, motion, useReducedMotion } from 'framer-motion'

export default function ScrollProgress() {
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 })

  if (reduced) return null

  return (
    <motion.div
      style={{ scaleX }}
      className="fixed top-0 left-0 right-0 h-[2px] bg-titanium/60 z-[100] origin-left pointer-events-none"
    />
  )
}
