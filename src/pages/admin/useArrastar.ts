import { useRef, useState, type DragEvent } from 'react'

/**
 * Arrastar para reordenar uma grelha.
 *
 * Vive à parte porque o portfólio e as galerias fazem exactamente o mesmo
 * gesto, e tê-lo escrito duas vezes garantia que uma correcção num só chegasse
 * a metade dos sítios.
 *
 * O arrasto do HTML não existe ao toque — num telemóvel, `dragstart` nunca
 * dispara. Por isso quem usa isto tem de manter as setas ao lado: são elas que
 * fazem o trabalho no telemóvel e para quem navega por teclado.
 */
export function useArrastar(mover: (de: number, para: number) => void) {
  /*
    O índice vive numa referência e não só em estado. O estado serve para
    desenhar o cartão esbatido, mas só fica visível no render seguinte — e uma
    largada rápida chega antes disso, com o handler ainda a ver `null` e a
    largada a não fazer nada. A referência é escrita no mesmo instante.
  */
  const origem = useRef<number | null>(null)
  const [aArrastar, setAArrastar] = useState<number | null>(null)

  const largar = () => {
    origem.current = null
    setAArrastar(null)
  }

  const propsDe = (i: number) => ({
    draggable: true,
    onDragStart: () => {
      origem.current = i
      setAArrastar(i)
    },
    // Sem isto o browser recusa a largada: por omissão, nada aceita nada.
    onDragOver: (e: DragEvent) => e.preventDefault(),
    onDrop: () => {
      if (origem.current !== null) mover(origem.current, i)
      largar()
    },
    onDragEnd: largar,
  })

  return { aArrastar, propsDe }
}
