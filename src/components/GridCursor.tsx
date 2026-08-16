import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

/**
 * Cursor próprio sobre a grelha do portfólio: uma bola com a palavra "Ver", a
 * dizer que as fotografias abrem.
 *
 * Só onde faz sentido: `hover: hover` e `pointer: fine` excluem telemóveis e
 * tablets, onde não há cursor nenhum para substituir, e a preferência de menos
 * movimento desliga-o por inteiro. O cursor do sistema continua a existir por
 * baixo — se este falhar, ninguém fica sem saber onde está o rato.
 */
export default function GridCursor({ texto }: { texto: string }) {
  const [ativo, setAtivo] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    // Nem todos os browsers antigos suportam estas media queries em JS; na
    // dúvida, não se desenha nada.
    if (!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return

    const grelha = document.querySelector<HTMLElement>('[data-cursor-grid]')
    if (!grelha) return

    // Posiciona via transform, fora do React: mexer estado a cada pixel do rato
    // punha a página inteira a re-renderizar dezenas de vezes por segundo.
    const mover = (e: MouseEvent) => {
      if (ref.current) {
        ref.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`
      }
    }
    const entrar = () => setAtivo(true)
    const sair = () => setAtivo(false)

    grelha.addEventListener('mousemove', mover)
    grelha.addEventListener('mouseenter', entrar)
    grelha.addEventListener('mouseleave', sair)
    return () => {
      grelha.removeEventListener('mousemove', mover)
      grelha.removeEventListener('mouseenter', entrar)
      grelha.removeEventListener('mouseleave', sair)
    }
  }, [reduced])

  if (reduced) return null

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`fixed top-0 left-0 z-[140] pointer-events-none hidden md:flex items-center justify-center w-20 h-20 rounded-full bg-titanium text-eerie transition-opacity duration-300 ${
        ativo ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <span className="text-[10px] uppercase tracking-[0.2em] font-semibold">{texto}</span>
    </div>
  )
}
