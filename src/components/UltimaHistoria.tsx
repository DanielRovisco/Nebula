import { Link } from 'react-router-dom'
import Reveal from '../lib/Reveal'
import { useLink, useT } from '../lib/i18n'
import { useHistorias } from '../lib/site-content/useSiteContent'
import { publicUrl } from '../lib/site-content/public'

/**
 * A última história, na página inicial.
 *
 * Uma e não três. Quem chega à página inicial não vem escolher entre
 * casamentos: vem perceber como é trabalhar connosco, e uma história contada
 * inteira responde a isso melhor do que uma fila de miniaturas.
 *
 * Desaparece sem histórias publicadas, como os testemunhos. Uma secção a dizer
 * "em breve" é um espaço vazio com uma desculpa em cima.
 */
export default function UltimaHistoria() {
  const t = useT()
  const link = useLink()
  const historias = useHistorias()
  const h = historias?.[0]
  if (!h?.coverKey) return null

  return (
    <section className="py-16 sm:py-28">
      <div className="container-px">
        <Reveal className="mb-8 sm:mb-12">
          <span className="label-sm">{t.nav.stories}</span>
        </Reveal>
      </div>

      <Reveal>
        <Link to={`${link('stories')}/${h.slug}`} className="group block relative overflow-hidden">
          <img
            src={publicUrl(h.coverKey)}
            srcSet={
              h.coverMediumKey && h.coverWidth
                ? `${publicUrl(h.coverMediumKey)} ${Math.round(h.coverWidth / 2)}w, `
                  + `${publicUrl(h.coverKey)} ${h.coverWidth}w`
                : undefined
            }
            sizes="100vw"
            alt={h.title}
            loading="lazy"
            decoding="async"
            style={{ objectPosition: h.coverPos }}
            className="w-full h-[60vh] sm:h-[80vh] object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-eerie/85 via-eerie/15 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 container-px pb-10 sm:pb-16">
            <h2 className="leading-[1.05] mb-3" style={{ fontSize: 'clamp(2rem, 5vw, 4.2rem)' }}>
              {h.title}
            </h2>
            {h.subtitle && <p className="label-sm text-titanium/60 mb-5">{h.subtitle}</p>}
            <span className="label-sm text-titanium/80 group-hover:text-titanium transition-colors">
              {t.stories.read} →
            </span>
          </div>
        </Link>
      </Reveal>
    </section>
  )
}
