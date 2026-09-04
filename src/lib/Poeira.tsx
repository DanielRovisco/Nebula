import { useEffect, useRef } from 'react'

/**
 * Poeira a flutuar no fundo do site.
 *
 * Substitui o papel que o grão grosso estava a fazer no computador, onde ele
 * lia como uma fotografia com ruído em vez de dar vida à página. O grão fica,
 * fino, a dar textura; o movimento passa a vir daqui.
 *
 * Fica **atrás** do conteúdo, não por cima. É a diferença entre poeira no ar e
 * sujidade no ecrã, e garante que nunca aparece por cima de uma fotografia
 * entregue a um cliente.
 *
 * Desenhado num canvas e não em elementos: noventa pontos com brilho seriam
 * noventa nós a compor a cada fotograma, e o browser trata disso muito pior do
 * que trata de um desenho só.
 */

/** Um ponto de poeira. Tudo em pixels CSS; a densidade do ecrã entra na escala. */
interface Particula {
  x: number
  y: number
  /** Raio do núcleo. O brilho estende-se bastante para lá dele. */
  r: number
  /** Opacidade base, antes da respiração. */
  a: number
  /** Velocidade, em pixels por segundo. */
  vx: number
  vy: number
  /** Onde vai na respiração, para não piscarem todas ao mesmo tempo. */
  fase: number
  /** Velocidade da respiração. */
  ritmo: number
  /** Um punhado é azulado, para o branco todo igual não parecer artificial. */
  frio: boolean
}

const aleatorio = (min: number, max: number) => min + Math.random() * (max - min)

/**
 * Desenha uma vez o ponto com brilho, para depois ser só copiado.
 *
 * Um gradiente radial por partícula e por fotograma é o caminho mais rápido
 * para o site engasgar num portátil. Assim faz-se o gradiente duas vezes na
 * vida da página e o resto é cópia, que a placa gráfica faz sem esforço.
 */
function fazerCarimbo(frio: boolean): HTMLCanvasElement {
  const tamanho = 64
  const c = document.createElement('canvas')
  c.width = tamanho
  c.height = tamanho
  const ctx = c.getContext('2d')!
  const meio = tamanho / 2
  const g = ctx.createRadialGradient(meio, meio, 0, meio, meio, meio)
  const cor = frio ? '203, 214, 232' : '252, 255, 240'
  // O núcleo é pequeno e o halo longo: é o halo que dá a sensação de brilho.
  g.addColorStop(0, `rgba(${cor}, 1)`)
  g.addColorStop(0.12, `rgba(${cor}, 0.85)`)
  g.addColorStop(0.35, `rgba(${cor}, 0.22)`)
  g.addColorStop(1, `rgba(${cor}, 0)`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, tamanho, tamanho)
  return c
}

export default function Poeira() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const carimboQuente = fazerCarimbo(false)
    const carimboFrio = fazerCarimbo(true)

    let largura = 0
    let altura = 0
    let particulas: Particula[] = []

    function dimensionar() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      largura = window.innerWidth
      altura = window.innerHeight
      canvas!.width = Math.round(largura * dpr)
      canvas!.height = Math.round(altura * dpr)
      canvas!.style.width = `${largura}px`
      canvas!.style.height = `${altura}px`
      // Desenha-se em pixels CSS; a escala trata da densidade do ecrã.
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)

      /*
        A quantidade acompanha a área, senão um telemóvel ficava com a mesma
        poeira de um monitor e parecia uma tempestade. Limitada em cima porque
        acima de uma centena deixa de se ganhar nada a olho e começa a custar.
      */
      const quantas = Math.max(22, Math.min(110, Math.round((largura * altura) / 19000)))
      particulas = Array.from({ length: quantas }, () => ({
        x: Math.random() * largura,
        y: Math.random() * altura,
        /*
          Tamanho e brilho não são sorteados de forma plana: elevar o sorteio a
          uma potência faz a maioria sair pequena e só de vez em quando sair uma
          grande e mais acesa. É isso que dá profundidade — um campo de pontos
          todos iguais lê-se como uma grelha, não como poeira a flutuar a
          distâncias diferentes.
        */
        r: 0.5 + Math.pow(Math.random(), 2.2) * 2.4,
        a: 0.16 + Math.pow(Math.random(), 1.4) * 0.5,
        // Devagar de propósito: entre 2 e 9 pixels por segundo. Atravessar o
        // ecrã leva minutos, e é isso que o faz parecer que flutua em vez de
        // andar.
        vx: aleatorio(-9, 9) / 3,
        vy: aleatorio(-9, 9) / 3,
        fase: Math.random() * Math.PI * 2,
        ritmo: aleatorio(0.15, 0.5),
        frio: Math.random() < 0.25,
      }))
    }

    function desenhar(t: number) {
      ctx!.clearRect(0, 0, largura, altura)
      for (const p of particulas) {
        // Respiração: cada uma acende e apaga ao seu ritmo, o que evita o
        // aspecto de grelha regular que um campo de pontos fixos tem sempre.
        const brilho = p.a * (0.55 + 0.45 * Math.sin(p.fase + t * p.ritmo))
        if (brilho <= 0.004) continue
        const carimbo = p.frio ? carimboFrio : carimboQuente
        // O carimbo é desenhado a oito vezes o raio: o núcleo fica com o
        // tamanho pedido e sobra halo à volta.
        const lado = p.r * 8
        ctx!.globalAlpha = brilho
        ctx!.drawImage(carimbo, p.x - lado / 2, p.y - lado / 2, lado, lado)
      }
      ctx!.globalAlpha = 1
    }

    dimensionar()

    if (quieto) {
      // Quem pediu menos movimento fica com o céu parado, não sem céu.
      desenhar(0)
      const aoRedimensionar = () => {
        dimensionar()
        desenhar(0)
      }
      window.addEventListener('resize', aoRedimensionar)
      return () => window.removeEventListener('resize', aoRedimensionar)
    }

    let pedido = 0
    let anterior = performance.now()
    let relogio = 0

    function ciclo(agora: number) {
      pedido = requestAnimationFrame(ciclo)
      /*
        O tempo entre fotogramas é limitado a 50ms. Sem isso, voltar a um
        separador que esteve minutos em segundo plano fazia as partículas
        saltarem meio ecrã de uma vez, e o que devia ser calmo dava um solavanco.
      */
      const dt = Math.min((agora - anterior) / 1000, 0.05)
      anterior = agora
      relogio += dt

      for (const p of particulas) {
        p.x += p.vx * dt
        p.y += p.vy * dt
        // Dá a volta pelo outro lado, com folga para não nascer à vista.
        const folga = p.r * 6
        if (p.x < -folga) p.x = largura + folga
        else if (p.x > largura + folga) p.x = -folga
        if (p.y < -folga) p.y = altura + folga
        else if (p.y > altura + folga) p.y = -folga
      }
      desenhar(relogio)
    }

    pedido = requestAnimationFrame(ciclo)

    /*
      Separador escondido não desenha nada. O browser já abranda sozinho o
      requestAnimationFrame, mas parar de vez é a diferença entre gastar pouco
      e não gastar nada de bateria com um separador que ninguém está a ver.
    */
    function aoMudarVisibilidade() {
      if (document.hidden) {
        cancelAnimationFrame(pedido)
        pedido = 0
      } else if (!pedido) {
        anterior = performance.now()
        pedido = requestAnimationFrame(ciclo)
      }
    }

    let temporizador = 0
    function aoRedimensionar() {
      window.clearTimeout(temporizador)
      temporizador = window.setTimeout(dimensionar, 150)
    }

    document.addEventListener('visibilitychange', aoMudarVisibilidade)
    window.addEventListener('resize', aoRedimensionar)

    return () => {
      cancelAnimationFrame(pedido)
      window.clearTimeout(temporizador)
      document.removeEventListener('visibilitychange', aoMudarVisibilidade)
      window.removeEventListener('resize', aoRedimensionar)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: -1 }}
    />
  )
}
