import { useEffect, useRef, useState } from 'react'
import { desenharQr } from '../lib/qr/desenhar'
import { simbolo } from '../lib/qr/simbolo'
import type { CorDoQr } from '../lib/qr/exportar'

/**
 * O código QR com o símbolo ao centro.
 *
 * O símbolo é carregado uma vez e reaproveitado: a página dos noivos desenha o
 * mesmo código em três sítios (o cartão, o ecrã cheio e o ficheiro que se
 * descarrega), e três pedidos ao mesmo PNG seriam três pedidos a mais.
 */
interface Props {
  url: string
  /** Lado em pixels do canvas desenhado. */
  tamanho?: number
  /** Escuro para fundos claros, claro para fundos escuros. */
  cor?: CorDoQr
  /** Sem isto o fundo fica transparente e assenta no que estiver por trás. */
  fundo?: string | null
  className?: string
  /** Chamada com o canvas pronto, para quem precise de o exportar. */
  aoDesenhar?: (canvas: HTMLCanvasElement) => void
}

const TINTA: Record<CorDoQr, string> = { preto: '#141414', branco: '#ffffff' }

export default function QrNebula({
  url, tamanho = 640, cor = 'preto', fundo = null, className, aoDesenhar,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [pronto, setPronto] = useState(false)

  useEffect(() => {
    let vivo = true
    simbolo(cor).then((marca) => {
      if (!vivo || !ref.current) return
      desenharQr(ref.current, url, {
        tamanho,
        frente: TINTA[cor],
        fundo,
        simbolo: marca,
        simboloEscala: 0.22,
      })
      setPronto(true)
      aoDesenhar?.(ref.current)
    })
    return () => { vivo = false }
  }, [url, tamanho, cor, fundo, aoDesenhar])

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={`Código QR para ${url}`}
      className={`${className ?? ''} transition-opacity duration-500 ${pronto ? 'opacity-100' : 'opacity-0'}`}
    />
  )
}
