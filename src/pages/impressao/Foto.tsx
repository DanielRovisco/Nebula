import { useEffect, useRef, useState } from 'react'

/**
 * Uma fotografia da mostra, desenhada como fundo e não como `<img>`.
 *
 * Não é preciosismo: numa `<img>`, o toque longo do iPhone abre "Guardar
 * imagem" e o do Android abre "Transferir imagem". Num fundo CSS não abrem, e
 * arrastar para a área de trabalho também não guarda nada. Não é um cadeado
 * — quem abrir as ferramentas do browser chega ao ficheiro à mesma, e é por
 * isso que o ficheiro já vem pequeno e marcado (ver lib/impressao/processar) —
 * mas fecha o gesto que noventa e nove em cada cem pessoas usariam.
 *
 * Carrega só quando chega perto do ecrã. Numa rede de casamento, pedir
 * quarenta e oito imagens ao mesmo tempo é pedir que não chegue nenhuma.
 */
export default function Foto({
  src,
  numero,
  className = '',
  ajuste = 'cover',
  tapado = false,
}: {
  src: string
  numero: number
  className?: string
  ajuste?: 'cover' | 'contain'
  /** Escondida enquanto a página não está à vista. */
  tapado?: boolean
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [perto, setPerto] = useState(false)
  const [pronta, setPronta] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // 300px de antecedência: tempo de a imagem chegar antes de o dedo lá estar.
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setPerto(true)
          obs.disconnect()
        }
      },
      { rootMargin: '300px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  /*
    Pede-se a imagem à parte para se saber quando ela chegou, e só então se põe
    como fundo. Sem isto, o quadrado passava de vazio a cheio sem transição e a
    grelha piscava toda ao mesmo tempo.
  */
  useEffect(() => {
    if (!perto) return
    const img = new Image()
    img.onload = () => setPronta(true)
    img.src = src
    return () => {
      img.onload = null
    }
  }, [perto, src])

  return (
    <div
      ref={ref}
      role="img"
      aria-label={`Fotografia número ${numero}`}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      className={`bg-white/[0.04] bg-no-repeat bg-center transition-opacity duration-500 ${className}`}
      style={{
        backgroundImage: pronta && !tapado ? `url("${src}")` : undefined,
        backgroundSize: ajuste,
        opacity: pronta ? 1 : 0.35,
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
    />
  )
}
