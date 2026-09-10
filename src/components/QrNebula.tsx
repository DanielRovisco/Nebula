import { useEffect, useRef, useState } from 'react'
import { desenharQr } from '../lib/qr/desenhar'
import { asset } from '../lib/asset'

/**
 * O código QR com o símbolo ao centro.
 *
 * O símbolo é carregado uma vez e reaproveitado: a página dos noivos desenha o
 * mesmo código em três sítios (o cartão, o ecrã cheio e o ficheiro que se
 * descarrega), e três pedidos ao mesmo PNG seriam três pedidos a mais.
 */
let simboloPromessa: Promise<HTMLImageElement | null> | null = null

function carregarSimbolo(): Promise<HTMLImageElement | null> {
  if (!simboloPromessa) {
    simboloPromessa = new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(img)
      // Sem símbolo o código continua a funcionar. Falhar o desenho todo por
      // causa de um logótipo que não carregou seria trocar o essencial pelo
      // acessório.
      img.onerror = () => resolve(null)
      img.src = asset('brand/logo-symbol-black.png')
    })
  }
  return simboloPromessa
}

interface Props {
  url: string
  /** Lado em pixels do canvas desenhado. */
  tamanho?: number
  className?: string
  /** Chamada com o canvas pronto, para quem precise de o exportar. */
  aoDesenhar?: (canvas: HTMLCanvasElement) => void
}

export default function QrNebula({ url, tamanho = 640, className, aoDesenhar }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [pronto, setPronto] = useState(false)

  useEffect(() => {
    let vivo = true
    carregarSimbolo().then((simbolo) => {
      if (!vivo || !ref.current) return
      desenharQr(ref.current, url, {
        tamanho,
        // Escuro sobre claro, sempre. Metade dos leitores de telemóvel recusa
        // um código invertido, e este vai ser impresso em papel branco.
        frente: '#141414',
        fundo: '#ffffff',
        simbolo,
        simboloEscala: 0.22,
      })
      setPronto(true)
      aoDesenhar?.(ref.current)
    })
    return () => { vivo = false }
  }, [url, tamanho, aoDesenhar])

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={`Código QR para ${url}`}
      className={`${className ?? ''} transition-opacity duration-500 ${pronto ? 'opacity-100' : 'opacity-0'}`}
    />
  )
}
