import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { X, ZoomIn } from 'lucide-react'
import Foto from './Foto'
import type { FotoPublica } from '../../lib/impressao/publica'

/**
 * A fotografia em ecrã cheio, com zoom de dois dedos.
 *
 * O zoom é escrito à mão em vez de se deixar o browser fazer o dele porque o
 * browser não faz: numa camada fixa por cima da página, o gesto de dois dedos
 * amplia a página inteira e leva a fotografia para fora do ecrã. Com os
 * eventos de ponteiro, o gesto fica dentro desta caixa e faz o que se espera.
 *
 * Dois dedos ampliam, um dedo arrasta quando já está ampliada, e dois toques
 * seguidos alternam entre inteira e ampliada — que é como toda a gente tenta
 * primeiro.
 */
const MAX = 3.2

export default function Visor({
  foto,
  aoFechar,
  tapado,
}: {
  foto: FotoPublica
  aoFechar: () => void
  tapado: boolean
}) {
  const reduzido = useReducedMotion()
  const [escala, setEscala] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  /*
    Há um dedo no ecrã neste momento.

    Existe como estado e não como referência porque é o desenho que depende
    dele: durante o gesto a fotografia segue o dedo sem transição nenhuma, e
    assim que o dedo sai, a volta à posição é suave. Uma referência lida durante
    o desenho não faz o React voltar a desenhar quando muda, e ficava a
    transição errada até ao render seguinte.
  */
  const [aGesticular, setAGesticular] = useState(false)
  const caixa = useRef<HTMLDivElement | null>(null)

  // Ponteiros em baixo neste momento, e o estado do gesto quando são dois.
  const dedos = useRef(new Map<number, { x: number; y: number }>())
  const pinca = useRef<{ dist: number; escala: number } | null>(null)
  const arrasto = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const ultimoToque = useRef(0)

  // Escape fecha, como em qualquer coisa que se abre por cima do resto.
  useEffect(() => {
    const t = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    window.addEventListener('keydown', t)
    return () => window.removeEventListener('keydown', t)
  }, [aoFechar])

  /*
    Enquanto o visor está aberto, o corpo da página não rola por trás. Sem isto,
    arrastar a fotografia ampliada arrastava a grelha lá atrás, e ao fechar a
    pessoa estava noutro sítio da mostra sem perceber porquê.
  */
  useEffect(() => {
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = antes
    }
  }, [])

  const distancia = () => {
    const [a, b] = [...dedos.current.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  /** Impede a fotografia ampliada de ser arrastada para fora do ecrã. */
  function travar(x: number, y: number, e: number) {
    const r = caixa.current?.getBoundingClientRect()
    if (!r) return { x, y }
    const folgaX = (r.width * (e - 1)) / 2
    const folgaY = (r.height * (e - 1)) / 2
    return {
      x: Math.max(-folgaX, Math.min(folgaX, x)),
      y: Math.max(-folgaY, Math.min(folgaY, y)),
    }
  }

  function aoDescer(e: React.PointerEvent) {
    dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    setAGesticular(true)
    if (dedos.current.size === 2) {
      pinca.current = { dist: distancia(), escala }
      arrasto.current = null
    } else if (dedos.current.size === 1) {
      arrasto.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }
      // Dois toques seguidos no mesmo sítio: alterna entre inteira e ampliada.
      const agora = Date.now()
      if (agora - ultimoToque.current < 300) {
        const nova = escala > 1 ? 1 : 2.2
        setEscala(nova)
        setPos({ x: 0, y: 0 })
        ultimoToque.current = 0
      } else {
        ultimoToque.current = agora
      }
    }
  }

  function aoMover(e: React.PointerEvent) {
    if (!dedos.current.has(e.pointerId)) return
    dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (dedos.current.size === 2 && pinca.current) {
      const nova = Math.min(MAX, Math.max(1, (distancia() / pinca.current.dist) * pinca.current.escala))
      setEscala(nova)
      if (nova === 1) setPos({ x: 0, y: 0 })
      else setPos((p) => travar(p.x, p.y, nova))
      return
    }
    if (dedos.current.size === 1 && arrasto.current && escala > 1) {
      const a = arrasto.current
      setPos(travar(a.px + (e.clientX - a.x), a.py + (e.clientY - a.y), escala))
    }
  }

  function aoSubir(e: React.PointerEvent) {
    dedos.current.delete(e.pointerId)
    if (dedos.current.size < 2) pinca.current = null
    if (dedos.current.size === 0) {
      arrasto.current = null
      setAGesticular(false)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-eerie flex flex-col"
      initial={reduzido ? undefined : { opacity: 0 }}
      animate={reduzido ? undefined : { opacity: 1 }}
      exit={reduzido ? undefined : { opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
        <span className="font-serif text-4xl tabular-nums">
          {String(foto.numero).padStart(3, '0')}
        </span>
        <button
          onClick={aoFechar}
          aria-label="Fechar"
          className="w-11 h-11 rounded-full border border-white/15 flex items-center justify-center active:scale-95 transition-transform"
        >
          <X size={18} />
        </button>
      </div>

      <div
        ref={caixa}
        onPointerDown={aoDescer}
        onPointerMove={aoMover}
        onPointerUp={aoSubir}
        onPointerCancel={aoSubir}
        onContextMenu={(e) => e.preventDefault()}
        // O browser não tenta rolar nem ampliar por cima do nosso gesto.
        className="flex-1 min-h-0 overflow-hidden touch-none"
      >
        <div
          className="w-full h-full"
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${escala})`,
            transition: aGesticular ? 'none' : 'transform 0.25s ease-out',
          }}
        >
          <Foto src={foto.url} numero={foto.numero} className="w-full h-full" ajuste="contain" tapado={tapado} />
        </div>
      </div>

      <p className="shrink-0 text-center text-xs text-titanium/40 px-6 py-5 flex items-center justify-center gap-2">
        {escala === 1 ? (
          <>
            <ZoomIn size={13} /> Dois dedos para aumentar
          </>
        ) : (
          'Diz o número na mesa para levares esta impressa'
        )}
      </p>
    </motion.div>
  )
}
