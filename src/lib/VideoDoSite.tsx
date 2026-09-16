import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

/**
 * Um vídeo do portefólio a tocar sozinho, e só enquanto está à vista.
 *
 * Num site de vídeo, um vídeo parado é uma fotografia com um triângulo em cima:
 * diz que há movimento algures e não o mostra. A faixa da página inicial é o
 * primeiro ecrã que alguém vê de nós, e é onde isso custa mais caro.
 *
 * O que trava é o custo. Quatro vídeos a tocar ao mesmo tempo num telemóvel é
 * bateria e dados de quem chegou para ver fotografias, por isso:
 *
 *  - toca só o que está mesmo à vista, e pára ao sair (o `IntersectionObserver`
 *    com sessenta por cento, que na faixa dá dois ou três de cada vez);
 *  - `preload="none"` com a miniatura por cima: o ficheiro só começa a descer
 *    quando chega a vez dele, e até lá não custa um byte;
 *  - sem som, sempre, e em ciclo: é uma amostra, não uma sessão de cinema;
 *  - quem pediu menos movimento ao sistema, ou tem a poupança de dados ligada,
 *    fica com a miniatura e mais nada — nem sequer se cria o elemento.
 */
export default function VideoDoSite({
  src,
  poster,
  alt,
  className,
  style,
}: {
  src: string
  /** A miniatura, que é o primeiro fotograma guardado no upload. */
  poster: string
  /** Vazio quando o item é decorativo (a segunda passagem da faixa). */
  alt: string
  className?: string
  style?: React.CSSProperties
}) {
  const reduzido = useReducedMotion()
  const ref = useRef<HTMLVideoElement | null>(null)

  /*
    A poupança de dados do sistema, lida uma vez.

    Não existe em todos os browsers, e por isso a leitura é defensiva. Onde
    existe, quem a ligou disse que não quer megabytes a descer sem pedir, e um
    vídeo a arrancar sozinho é exactamente isso.
  */
  const [poupanca] = useState(() => {
    try {
      return Boolean(
        (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData,
      )
    } catch {
      return false
    }
  })

  const parado = reduzido || poupanca

  useEffect(() => {
    if (parado) return
    const el = ref.current
    if (!el) return

    const obs = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          // A promessa do `play` é recusada em alguns casos (aba em segundo
          // plano, poupança de energia do sistema). Fica a miniatura, que é o
          // comportamento certo, e não um erro na consola.
          el.play().catch(() => {})
        } else {
          el.pause()
        }
      },
      { threshold: 0.6 },
    )
    obs.observe(el)
    return () => {
      obs.disconnect()
      el.pause()
    }
  }, [parado])

  if (parado) {
    return <img src={poster} alt={alt} loading="lazy" decoding="async" className={className} style={style} />
  }

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      // Sem controlos e sem receber cliques: na grelha e na faixa, clicar abre
      // a janela grande, que é onde o vídeo tem barra, som e tamanho a sério.
      aria-label={alt || undefined}
      className={className}
      style={style}
    />
  )
}
