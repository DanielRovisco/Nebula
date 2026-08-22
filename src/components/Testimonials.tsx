import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Reveal from '../lib/Reveal'
import { useT } from '../lib/i18n'
import { useTestimonials } from '../lib/site-content/useSiteContent'
import { useFaixa } from '../lib/useFaixa'

/**
 * O que os clientes dizem, numa faixa que se arrasta para o lado.
 *
 * Em grelha, três testemunhos compridos empurravam meia página para baixo no
 * telemóvel e faziam com que quase ninguém chegasse ao fim. Lado a lado, a
 * secção ocupa a altura de um cartão e quem quiser lê os outros.
 *
 * Sem testemunhos carregados, a secção não existe — nem título, nem espaço em
 * branco, nem texto de reserva. Uma secção vazia a dizer "em breve" é pior do
 * que secção nenhuma, e inventar elogios estava fora de questão.
 */
export default function Testimonials() {
  const t = useT()
  const testemunhos = useTestimonials()
  const faixa = useRef<HTMLDivElement>(null)
  /*
    Movimento automático e arrasto com o rato, na mesma faixa que já existia.

    Só a partir de quatro testemunhos: com três eles cabem todos num ecrã
    largo, e uma faixa a andar sem ter para onde ir é ruído. Mais devagar do
    que a das fotografias, porque isto é para ler — e pára com o rato em cima
    ou com o teclado lá dentro, que é o que permite acabar a frase.
  */
  const auto = useFaixa(16, { ref: faixa, ativo: testemunhos.length > 3 })
  // Extremos da faixa, para não deixar setas activas que não fazem nada.
  const [naInicial, setNaInicial] = useState(true)
  const [naFinal, setNaFinal] = useState(false)
  // Num ecrã largo os cartões cabem todos e não há nada para deslizar. Aí as
  // setas desaparecem em vez de ficarem apagadas: um controlo que nunca faz
  // nada é ruído, e dois controlos apagados a par parecem uma avaria.
  const [transborda, setTransborda] = useState(false)

  useEffect(() => {
    const el = faixa.current
    if (!el) return
    // O observador dispara logo ao começar a observar, por isso a primeira
    // medição vem daqui e não de uma leitura solta durante o render.
    const obs = new ResizeObserver(() => {
      setTransborda(el.scrollWidth > el.clientWidth + 8)
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [testemunhos.length])

  if (testemunhos.length === 0) return null

  const aoDeslizar = () => {
    const el = faixa.current
    if (!el) return
    setNaInicial(el.scrollLeft <= 8)
    // A margem de 8px absorve os arredondamentos do browser: sem ela a seta da
    // direita ficava activa no fim da faixa em alguns níveis de zoom.
    setNaFinal(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8)
  }

  const empurrar = (sentido: 1 | -1) => {
    const el = faixa.current
    if (!el) return
    // Um cartão de cada vez: o primeiro filho dá a largura real, seja ela em
    // vw ou em px, sem a duplicarmos aqui em número.
    const cartao = el.firstElementChild as HTMLElement | null
    const passo = cartao ? cartao.offsetWidth + 16 : el.clientWidth
    el.scrollBy({ left: passo * sentido, behavior: 'smooth' })
  }

  const varios = testemunhos.length > 1
  const desliza = varios && transborda

  return (
    <>
      <div className="container-px"><div className="hairline" /></div>

      <section className="py-16 sm:py-28">
        <div className="container-px flex items-end justify-between gap-6">
          <Reveal className="mb-10 sm:mb-16">
            <span className="label-sm">{t.testimonials.label}</span>
            <h2 className="text-3xl sm:text-5xl mt-3">{t.testimonials.title}</h2>
          </Reveal>

          {/*
            Setas só onde há rato. No telemóvel arrasta-se com o dedo e elas
            só roubavam espaço; o cartão seguinte a espreitar já diz que há
            mais para ver.
          */}
          {desliza && (
            <div className="hidden [@media(hover:hover)]:flex gap-2 mb-10 sm:mb-16 shrink-0">
              {([-1, 1] as const).map((sentido) => {
                const desactivada = sentido === -1 ? naInicial : naFinal
                const Icone = sentido === -1 ? ChevronLeft : ChevronRight
                return (
                  <button
                    key={sentido}
                    onClick={() => empurrar(sentido)}
                    disabled={desactivada}
                    aria-label={sentido === -1 ? t.testimonials.previous : t.testimonials.next}
                    className="w-11 h-11 rounded-full border border-white/15 flex items-center justify-center text-titanium/70 hover:text-titanium hover:border-white/30 disabled:opacity-25 disabled:pointer-events-none transition-all"
                  >
                    <Icone size={17} />
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/*
          A faixa sangra até às margens do ecrã, mas o primeiro cartão alinha
          com o resto da página: o recuo vem do padding interno, não de um
          contentor à volta. Assim o último cartão consegue chegar ao fim sem
          ficar colado ao rebordo.

          `tabIndex` e `role` não são enfeite: uma zona que se percorre com o
          dedo tem de se poder percorrer com o teclado, e sem isto o conteúdo
          fora do ecrã ficava inalcançável para quem não usa rato nem toque.
        */}
        <div
          {...auto.props}
          onScroll={aoDeslizar}
          tabIndex={desliza ? 0 : -1}
          role={desliza ? 'region' : undefined}
          aria-label={desliza ? t.testimonials.title : undefined}
          className={`faixa-testemunhos container-px flex gap-4 sm:gap-5 ${
            /*
              O encaixe sai quando a faixa anda sozinha: puxava-a de volta ao
              cartão mais próximo a cada fotograma e o movimento não saía do
              sítio. Parada, o encaixe é bom — é o que faz cada cartão ficar
              inteiro no ecrã ao arrastar com o dedo.
            */
            varios
              ? `overflow-x-auto cursor-grab active:cursor-grabbing select-none ${
                  auto.ativo ? '' : 'snap-x snap-mandatory'
                }`
              : ''
          }`}
        >
          {/*
            Com movimento automático, a lista é desenhada duas vezes: é a
            segunda passagem que deixa voltar ao princípio a meio sem se ver o
            salto. A cópia fica escondida de quem lê por voz, senão ouvia cada
            testemunho duas vezes seguidas.
          */}
          {(auto.ativo ? [0, 1] : [0]).map((passagem) =>
            testemunhos.map((item, i) => (
            <Reveal
              key={`${passagem}-${item.id}`}
              aria-hidden={passagem === 1 || undefined}
              delay={Math.min(i * 0.08, 0.24)}
              className={
                /*
                  Até aos 1024px o cartão tem largura fixa e a faixa desliza —
                  o seguinte fica meio à mostra, que é o que diz "há mais".
                  A partir daí os três repartem a largura e a faixa deixa de
                  ter para onde andar: vira uma linha, e as setas somem-se
                  sozinhas. Com largura fixa também no desktop sobravam 54px
                  de deslize, o suficiente para as setas aparecerem e quase
                  nada para elas fazerem.
                */
                varios
                  ? `snap-start w-[82vw] sm:w-[340px] ${auto.ativo ? 'shrink-0' : 'max-lg:shrink-0 lg:w-auto lg:flex-1'}`
                  : 'max-w-2xl'
              }
            >
              <figure className="h-full border border-white/10 rounded-2xl p-7 sm:p-8 flex flex-col hover:border-white/20 transition-colors">
                <span aria-hidden="true" className="font-serif text-titanium/15 leading-none text-5xl mb-3">
                  &ldquo;
                </span>
                <blockquote className="flex-1 text-titanium/70 leading-relaxed text-[15px]">
                  {item.quote}
                </blockquote>
                <figcaption className="mt-7 pt-5 border-t border-white/[0.08]">
                  <span className="block text-titanium/90">{item.author}</span>
                  {item.context && (
                    <span className="block text-xs text-titanium/55 mt-1">{item.context}</span>
                  )}
                </figcaption>
              </figure>
            </Reveal>
            )),
          )}
        </div>
      </section>
    </>
  )
}
