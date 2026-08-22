import { useEffect, useRef, useState, type RefObject } from 'react'
import { useReducedMotion } from 'framer-motion'

/**
 * Uma faixa que anda sozinha, devagar, e que se pode arrastar.
 *
 * Existe porque uma fila de fotografias que não se mexe não diz que há mais à
 * direita: no telemóvel percebe-se pelo dedo, no computador ninguém adivinha.
 * O movimento lento é o que revela que aquilo continua.
 *
 * Para andar sem saltos, o conteúdo é desenhado duas vezes (ver `duplicar`) e a
 * posição volta ao princípio a meio — como não há diferença visível entre as
 * duas metades, o regresso não se nota.
 *
 * Pára com o rato em cima, durante o arrasto, com o teclado lá dentro, e
 * quando o separador está escondido. E não arranca de todo para quem pediu
 * menos movimento no sistema: aí fica uma faixa normal, que se arrasta e se
 * percorre, mas parada.
 */
export function useFaixa(
  velocidade = 22,
  /**
   * `ref` para reaproveitar uma referência que o componente já tenha (as setas
   * dos testemunhos precisam dela). `ativo` para desligar o movimento sem
   * desligar o arrasto — com poucos cartões, andar sem ter para onde ir é
   * ruído.
   */
  opcoes: { ref?: RefObject<HTMLDivElement | null>; ativo?: boolean } = {},
) {
  const proprio = useRef<HTMLDivElement>(null)
  const ref = opcoes.ref ?? proprio
  const ativo = opcoes.ativo ?? true
  const reduzido = useReducedMotion()
  const [parada, setParada] = useState(false)
  const aArrastar = useRef(false)

  // ── andar sozinha ──
  useEffect(() => {
    const el = ref.current
    if (!el || reduzido || parada || !ativo) return
    let anterior = performance.now()
    let id = 0
    /*
      A posição é contada aqui, em vírgula flutuante, e só depois escrita.
      Somá-la directamente ao `scrollLeft` não funciona: a esta velocidade cada
      fotograma vale menos de meio pixel, o browser arredonda ao guardar, e a
      faixa fica parada para sempre sem que nada o denuncie.
    */
    let pos = el.scrollLeft

    const passo = (agora: number) => {
      const dt = Math.min(agora - anterior, 100) // um separador que volta ao fim de minutos não dá um salto
      anterior = agora
      const metade = el.scrollWidth / 2
      if (metade > 0) {
        // Alguém mexeu na faixa (arrasto, roda, dedo): continua de onde ficou.
        if (Math.abs(el.scrollLeft - pos) > 1.5) pos = el.scrollLeft
        pos += (velocidade * dt) / 1000
        if (pos >= metade) pos -= metade
        el.scrollLeft = pos
      }
      id = requestAnimationFrame(passo)
    }
    id = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(id)
  }, [ref, reduzido, parada, velocidade, ativo])

  // ── parar quando ninguém está a ver ──
  useEffect(() => {
    const aoMudar = () => setParada(document.hidden)
    document.addEventListener('visibilitychange', aoMudar)
    return () => document.removeEventListener('visibilitychange', aoMudar)
  }, [])

  /*
    Arrastar com o rato. O browser só faz isto sozinho ao toque; no computador,
    sem isto, resta a roda do rato na horizontal, que quase ninguém sabe que
    existe.
  */
  const props = {
    ref,
    onPointerEnter: () => setParada(true),
    onPointerLeave: () => setParada(false),
    onFocusCapture: () => setParada(true),
    onBlurCapture: () => setParada(false),
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'touch') return // ao toque, o browser já o faz melhor
      const el = ref.current
      if (!el) return
      aArrastar.current = true
      setParada(true)
      const x0 = e.clientX
      const s0 = el.scrollLeft
      el.setPointerCapture(e.pointerId)
      const mover = (m: PointerEvent) => {
        if (aArrastar.current) el.scrollLeft = s0 - (m.clientX - x0)
      }
      const largar = () => {
        aArrastar.current = false
        el.removeEventListener('pointermove', mover)
        el.removeEventListener('pointerup', largar)
        el.removeEventListener('pointercancel', largar)
      }
      el.addEventListener('pointermove', mover)
      el.addEventListener('pointerup', largar)
      el.addEventListener('pointercancel', largar)
    },
  }

  return { props, ativo }
}

/**
 * Baralha uma lista, sem lhe tocar.
 *
 * Usado uma vez por visita: quem volta ao site não encontra a mesma fila pela
 * mesma ordem, e as fotografias do fim deixam de ser as que ninguém vê.
 */
export function baralhar<T>(lista: readonly T[]): T[] {
  const a = [...lista]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
