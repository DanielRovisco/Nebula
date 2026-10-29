import { Link } from 'react-router-dom'
import Seo from '../lib/Seo'
import Reveal from '../lib/Reveal'
import { useLink, useT } from '../lib/i18n'
import { useHistorias } from '../lib/site-content/useSiteContent'
import { publicUrl } from '../lib/site-content/public'
import { breadcrumbJsonLd } from '../lib/breadcrumbJsonLd'

/**
 * A lista de histórias.
 *
 * Uma por linha e do tamanho do ecrã, não uma grelha de cartões. Uma história é
 * um dia inteiro de uma vida de duas pessoas; mostrada num quadrado de 300
 * pixels ao lado de outros nove, deixa de o ser. Quem vem aqui está a decidir
 * se nos entrega o casamento, e isso decide-se devagar.
 */
export default function Historias() {
  const t = useT()
  const link = useLink()
  const historias = useHistorias()

  return (
    <div className="pt-28 sm:pt-36">
      <Seo
        title={t.stories.seoTitle}
        description={t.stories.seoDescription}
        canonical={link('stories')}
        jsonLd={[
          breadcrumbJsonLd([
            { nome: t.nav.home, caminho: link('home') },
            { nome: t.nav.stories, caminho: link('stories') },
          ]),
        ]}
      />

      <header className="container-px mb-16 sm:mb-24">
        <Reveal>
          <h1 className="leading-[1.05] mb-6" style={{ fontSize: 'clamp(2.4rem, 7vw, 6rem)' }}>
            {t.stories.title}
          </h1>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="text-titanium/50 leading-relaxed max-w-xl">{t.stories.intro}</p>
        </Reveal>
      </header>

      {/*
        Enquanto não se sabe, não se diz nada.

        A lista chega da rede e demora uns instantes. Mostrar "ainda não há
        histórias" nesse intervalo é dizer uma coisa falsa a quem acabou de
        chegar, e quem a lê vai-se embora antes de elas aparecerem.
      */}
      {historias === null ? (
        <div className="min-h-[40vh]" />
      ) : historias.length === 0 ? (
        <p className="container-px text-titanium/55 min-h-[30vh]">{t.stories.empty}</p>
      ) : (
        <div className="space-y-20 sm:space-y-32 pb-24 sm:pb-40">
          {historias.map((h) => (
            <Reveal key={h.id}>
              <Link to={`${link('stories')}/${h.slug}`} className="group block">
                <div className="relative overflow-hidden">
                  <img
                    src={publicUrl(h.coverKey!)}
                    srcSet={
                      h.coverMediumKey && h.coverWidth
                        ? `${publicUrl(h.coverMediumKey)} ${Math.round(h.coverWidth / 2)}w, `
                          + `${publicUrl(h.coverKey!)} ${h.coverWidth}w`
                        : undefined
                    }
                    sizes="100vw"
                    alt={h.title}
                    loading="lazy"
                    style={{ objectPosition: h.coverPos }}
                    className="w-full h-[55vh] sm:h-[78vh] object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.03]"
                  />
                  {/*
                    O véu existe para o texto se ler, e só do lado onde ele
                    está: um escurecimento a toda a largura estragava a
                    fotografia para ganhar legibilidade que já havia.
                  */}
                  <div className="absolute inset-0 bg-gradient-to-t from-eerie/80 via-eerie/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 container-px pb-8 sm:pb-12">
                    <h2
                      className="leading-[1.05] mb-2"
                      style={{ fontSize: 'clamp(1.8rem, 4.5vw, 3.6rem)' }}
                    >
                      {h.title}
                    </h2>
                    {h.subtitle && (
                      <p className="label-sm text-titanium/60">{h.subtitle}</p>
                    )}
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      )}

      {/* ── Marcar ─────────────────────────────────────────── */}
      <section className="py-20 sm:py-32 border-t border-white/[0.06]">
        <div className="container-px text-center">
          <Reveal>
            <h2 className="leading-[1.05] mb-6" style={{ fontSize: 'clamp(1.8rem, 4.5vw, 3.6rem)' }}>
              {t.stories.ctaTitle}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-titanium/60 mb-10">{t.stories.ctaBody}</p>
          </Reveal>
          <Reveal delay={0.2}>
            <Link
              to={link('contact')}
              className="inline-block bg-titanium text-eerie px-10 py-4 rounded-full text-[11px] uppercase tracking-[0.18em] font-semibold active:scale-95 transition-all"
            >
              {t.stories.cta}
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
