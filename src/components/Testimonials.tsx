import Reveal from '../lib/Reveal'
import { useTestimonials } from '../lib/site-content/useSiteContent'

/**
 * O que os clientes dizem.
 *
 * Sem testemunhos carregados, a secção não existe — nem título, nem espaço em
 * branco, nem texto de reserva. Uma secção vazia a dizer "em breve" é pior do
 * que secção nenhuma, e inventar elogios estava fora de questão.
 */
export default function Testimonials() {
  const testemunhos = useTestimonials()
  if (testemunhos.length === 0) return null

  return (
    <>
      <div className="container-px"><div className="hairline" /></div>

      <section className="py-16 sm:py-28">
        <div className="container-px">
          <Reveal className="mb-10 sm:mb-16">
            <span className="label-sm">Quem já passou por aqui</span>
            <h2 className="text-3xl sm:text-5xl mt-3">O que dizem de nós</h2>
          </Reveal>

          <div
            className={`grid gap-4 sm:gap-5 ${
              testemunhos.length === 1
                ? 'max-w-2xl'
                : testemunhos.length === 2
                  ? 'md:grid-cols-2'
                  : 'md:grid-cols-2 lg:grid-cols-3'
            }`}
          >
            {testemunhos.map((t, i) => (
              <Reveal key={t.id} delay={Math.min(i * 0.08, 0.24)}>
                <figure className="h-full border border-white/10 rounded-2xl p-7 sm:p-8 flex flex-col hover:border-white/20 transition-colors">
                  <span aria-hidden="true" className="font-serif text-titanium/15 leading-none text-5xl mb-3">
                    &ldquo;
                  </span>
                  <blockquote className="flex-1 text-titanium/70 leading-relaxed text-[15px]">
                    {t.quote}
                  </blockquote>
                  <figcaption className="mt-7 pt-5 border-t border-white/[0.08]">
                    <span className="block text-titanium/90">{t.author}</span>
                    {t.context && (
                      <span className="block text-xs text-titanium/35 mt-1">{t.context}</span>
                    )}
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
