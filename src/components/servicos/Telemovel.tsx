import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

/**
 * O corpo do telemóvel onde os ecrãs de exemplo vivem.
 *
 * Serve para uma coisa que nenhum texto faz: mostrar que as galerias e a
 * página dos convidados existem mesmo, e que são bonitas. Quem está a escolher
 * fotógrafo lê "galeria online privada" em todos os sites do país; ver o ecrã
 * é outra conversa.
 *
 * Tudo aqui dentro é decoração, e é por isso que leva `aria-hidden` e
 * `pointer-events-none`: nada se clica, nada se preenche, e quem ouve a página
 * não fica a ouvir um formulário falso. O texto a sério está ao lado, e é esse
 * que conta.
 *
 * A largura é fixa em pixels, ao contrário de tudo o resto no site. Um
 * telemóvel que encolhe com o ecrã deixa de se ler como telemóvel, e o
 * conteúdo lá dentro foi desenhado para esta largura exacta.
 */
export default function Telemovel({
  children,
  className = '',
  atraso = 0,
  inclinacao = 0,
}: {
  children: ReactNode
  className?: string
  atraso?: number
  /** Graus de rotação em repouso. Dois telemóveis direitos lêem-se como uma captura de ecrã. */
  inclinacao?: number
}) {
  const reduzido = useReducedMotion()

  return (
    <motion.div
      aria-hidden="true"
      className={`relative pointer-events-none select-none ${className}`}
      initial={reduzido ? undefined : { opacity: 0, y: 60, rotate: inclinacao * 2.2, scale: 0.94 }}
      whileInView={reduzido ? undefined : { opacity: 1, y: 0, rotate: inclinacao, scale: 1 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 1.1, delay: atraso, ease: [0.16, 1, 0.3, 1] }}
    >
      {/*
        O brilho por trás do aparelho. Sem ele o telemóvel preto assentava num
        fundo preto e ficava a flutuar sem peso nenhum.
      */}
      <div
        className="absolute -inset-8 rounded-[3rem] blur-2xl opacity-60"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 30%, rgba(252,255,240,0.09), rgba(252,255,240,0) 70%)',
        }}
      />
      <div
        className="relative w-[272px] rounded-[2.6rem] p-[3px]"
        style={{
          background: 'linear-gradient(160deg, rgba(252,255,240,0.28), rgba(252,255,240,0.05) 45%, rgba(252,255,240,0.16))',
          boxShadow: '0 40px 80px -30px rgba(0,0,0,0.9), 0 0 0 1px rgba(0,0,0,0.4)',
        }}
      >
        <div className="relative rounded-[2.45rem] overflow-hidden bg-eerie h-[560px]">
          {/* A ilha do topo, com as proporções das verdadeiras. */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 h-[22px] w-[84px] rounded-full bg-black/90" />
          {/*
            O ecrã rola sozinho? Não. O conteúdo é escolhido para caber, e o
            que passa da altura é cortado de propósito: um ecrã cortado a meio
            lê-se como uma página que continua, que é verdade.
          */}
          <div className="h-full overflow-hidden">{children}</div>
          {/* Desvanecimento no fundo, para o corte não parecer um erro. */}
          <div
            className="absolute inset-x-0 bottom-0 h-20"
            style={{ background: 'linear-gradient(to top, #141414, rgba(20,20,20,0))' }}
          />
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-[3px] w-[92px] rounded-full bg-titanium/25" />
        </div>
      </div>
    </motion.div>
  )
}
