import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import Reveal from '../lib/Reveal'

/**
 * O manifesto da página inicial, contado como uma mudança de foco.
 *
 * "O tempo passa. / As imagens ficam" é uma frase sobre o tempo, e numa página
 * o tempo é o scroll. Enquanto se desce, o foco passa de uma linha para a
 * outra, como uma câmara a mudar de plano: a primeira começa nítida e vai
 * perdendo o foco e a luz, a segunda começa desfocada e assenta. No fim fica
 * nítido o que fica, que é o que a frase diz.
 *
 * É o único momento do site com movimento de autor; o resto das entradas é
 * discreto de propósito, para este se notar.
 *
 * O desfoque é caro, por isso está contido: duas linhas de texto, e o valor
 * passa pela mesma mola do Paralaxe, que o deixa arrastar-se atrás de uma roda
 * de rato que salta de cem em cem pixels. Com menos movimento, as duas linhas
 * ficam paradas e nítidas, com o desenho de sempre: a primeira mais clara.
 */
export default function Manifesto({ linhas, nota }: { linhas: string[]; nota: string }) {
  const reduzido = useReducedMotion()
  const ref = useRef<HTMLElement | null>(null)

  /*
    De quando o topo da secção passa os 85% do ecrã até o centro dela chegar
    aos 40%: a mudança de foco acontece enquanto a frase está à vista e acaba
    antes de ela começar a sair por cima.
  */
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'center 0.4'] })
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 26, mass: 0.6 })

  // A primeira linha aguenta-se nítida até a segunda começar a assentar.
  const saiFiltro = useTransform(p, [0.35, 0.9], ['blur(0px)', 'blur(5px)'])
  const saiLuz = useTransform(p, [0.35, 0.9], [0.92, 0.4])
  const entraFiltro = useTransform(p, [0, 0.6], ['blur(9px)', 'blur(0px)'])
  const entraLuz = useTransform(p, [0, 0.6], [0.28, 0.92])

  const tamanho = { fontSize: 'clamp(2rem, 5.5vw, 5rem)' }

  return (
    <section ref={ref} className="py-20 sm:py-36 md:py-44">
      <div className="container-px">
        {reduzido ? (
          <>
            <p className="font-serif italic leading-[1.12] text-titanium/92" style={tamanho}>
              {linhas[0]}
            </p>
            <p className="font-serif italic leading-[1.12] text-titanium/60 mt-1 sm:mt-2" style={tamanho}>
              {linhas[1]}
            </p>
          </>
        ) : (
          <>
            <motion.p
              className="font-serif italic leading-[1.12] text-titanium will-change-[filter,opacity]"
              style={{ ...tamanho, filter: saiFiltro, opacity: saiLuz }}
            >
              {linhas[0]}
            </motion.p>
            <motion.p
              className="font-serif italic leading-[1.12] text-titanium mt-1 sm:mt-2 will-change-[filter,opacity]"
              style={{ ...tamanho, filter: entraFiltro, opacity: entraLuz }}
            >
              {linhas[1]}
            </motion.p>
          </>
        )}
        <Reveal delay={0.22} className="mt-10 sm:mt-14">
          <p className="text-sm text-titanium/55 max-w-sm leading-relaxed">{nota}</p>
        </Reveal>
      </div>
    </section>
  )
}
