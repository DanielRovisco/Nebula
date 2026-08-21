import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { CONTACT } from '../lib/site'

export default function FloatingActions() {
  const reduced = useReducedMotion()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 320)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.8, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 16 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-6 right-5 sm:right-8 z-50"
        >
          <a
            href={CONTACT.instagramDm}
            target="_blank"
            rel="noreferrer"
            // O mesmo que o texto visível, e não uma frase mais completa: quem usa
            // controlo por voz diz em voz alta o que lê no ecrã, e um nome
            // acessível diferente do rótulo deixa o comando sem alvo.
            aria-label="Instagram"
            // Em telemóvel só aparece o ícone, por isso o botão é um círculo
            // perfeito e centra. O padding assimétrico (pl-4 pr-5) só entra a
            // partir de sm, quando há texto ao lado para o justificar.
            className="flex items-center justify-center gap-2.5 bg-titanium text-eerie w-12 h-12 sm:w-auto sm:pl-4 sm:pr-5 rounded-full shadow-xl shadow-black/40 hover:scale-105 active:scale-95 transition-transform"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/>
            </svg>
            <span className="text-[11px] font-semibold tracking-wide hidden sm:block">Instagram</span>
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
