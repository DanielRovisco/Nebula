import { Link, useParams } from 'react-router-dom'
import Seo from '../lib/Seo'
import Reveal from '../lib/Reveal'
import { useLink, useT } from '../lib/i18n'
import { useHistoria } from '../lib/site-content/useSiteContent'
import { publicUrl } from '../lib/site-content/public'
import { breadcrumbJsonLd } from '../lib/breadcrumbJsonLd'
import type { BlocoHistoria } from '../lib/site-content/types'

/**
 * Uma fotografia da história, no tamanho que lhe foi dado no painel.
 *
 * O `srcset` anuncia os dois ficheiros que o upload já cria: o grande e o de
 * metade da largura. Sem ele, um telemóvel descarregava os 2400 pixels que só
 * um portátil de retina aproveita, e uma história tem dezenas de fotografias.
 */
function Fotografia({ bloco, sizes }: { bloco: BlocoHistoria; sizes: string }) {
  const grande = publicUrl(bloco.storageKey ?? '')
  return (
    <img
      src={grande}
      srcSet={
        bloco.mediumKey && bloco.width
          ? `${publicUrl(bloco.mediumKey)} ${Math.round(bloco.width / 2)}w, ${grande} ${bloco.width}w`
          : undefined
      }
      sizes={sizes}
      alt={bloco.alt}
      loading="lazy"
      width={bloco.width ?? undefined}
      height={bloco.height ?? undefined}
      className="w-full h-auto"
    />
  )
}

/**
 * Agrupa os blocos para desenhar.
 *
 * Dois "lado a lado" seguidos formam um par; um sozinho fica como um "grande".
 * A conta é feita aqui, uma vez, e não dentro do desenho: uma linha que depende
 * da seguinte é o tipo de coisa que, misturada com JSX, deixa de se perceber à
 * segunda leitura.
 */
function agrupar(blocos: BlocoHistoria[]): BlocoHistoria[][] {
  const grupos: BlocoHistoria[][] = []
  for (let i = 0; i < blocos.length; i++) {
    const b = blocos[i]
    const seguinte = blocos[i + 1]
    if (b.kind === 'foto' && b.largura === 'par' && seguinte?.kind === 'foto' && seguinte.largura === 'par') {
      grupos.push([b, seguinte])
      i++
    } else {
      grupos.push([b])
    }
  }
  return grupos
}

export default function Historia() {
  const { slug = '' } = useParams()
  const t = useT()
  const link = useLink()
  const dados = useHistoria(slug)

  if (dados === null) return <div className="min-h-screen" />

  if (dados === false) {
    return (
      <div className="pt-40 pb-32 container-px min-h-[60vh]">
        <p className="text-titanium/50 mb-8">{t.stories.notFound}</p>
        <Link to={link('stories')} className="label-sm hover:text-titanium/70 transition-colors">
          ← {t.stories.back}
        </Link>
      </div>
    )
  }

  const { historia: h, blocos } = dados
  const capa = h.coverKey ? publicUrl(h.coverKey) : undefined
  const descricao = (h.intro || h.subtitle || t.stories.seoDescription).slice(0, 180)

  return (
    <article>
      <Seo
        title={`${h.title} | NEBULA`}
        description={descricao}
        image={capa}
        canonical={`${link('stories')}/${h.slug}`}
        jsonLd={[
          breadcrumbJsonLd([
            { nome: t.nav.home, caminho: link('home') },
            { nome: t.nav.stories, caminho: link('stories') },
            { nome: h.title, caminho: `${link('stories')}/${h.slug}` },
          ]),
        ]}
      />

      {/* ── A capa ─────────────────────────────────────────── */}
      <header className="relative h-[82vh] min-h-[32rem] flex items-end overflow-hidden">
        {capa && (
          <img
            src={capa}
            alt=""
            style={{ objectPosition: h.coverPos }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-eerie via-eerie/25 to-eerie/10" />
        <div className="relative container-px pb-16 sm:pb-24 w-full">
          <Reveal>
            <h1 className="leading-[1.03]" style={{ fontSize: 'clamp(2.6rem, 8vw, 7rem)' }}>
              {h.title}
            </h1>
          </Reveal>
          {h.subtitle && (
            <Reveal delay={0.1}>
              <p className="label-sm text-titanium/60 mt-5">{h.subtitle}</p>
            </Reveal>
          )}
        </div>
      </header>

      {/* ── A abertura ─────────────────────────────────────── */}
      {h.intro && (
        <section className="container-px py-20 sm:py-32">
          <Reveal>
            <p
              className="max-w-2xl mx-auto text-center text-titanium/70 leading-[1.9]"
              style={{ fontSize: 'clamp(1.05rem, 1.6vw, 1.35rem)' }}
            >
              {h.intro}
            </p>
          </Reveal>
        </section>
      )}

      {/* ── O dia ──────────────────────────────────────────── */}
      <div className="pb-8">
        {agrupar(blocos).map((grupo) => {
          const primeiro = grupo[0]

          if (primeiro.kind === 'texto') {
            if (!primeiro.texto?.trim()) return null
            return (
              <section key={primeiro.id} className="container-px py-14 sm:py-24">
                <Reveal>
                  <p className="max-w-xl mx-auto text-titanium/60 leading-[1.95] whitespace-pre-line">
                    {primeiro.texto}
                  </p>
                </Reveal>
              </section>
            )
          }

          if (grupo.length === 2) {
            return (
              <section key={primeiro.id} className="container-px py-4 sm:py-8">
                <Reveal>
                  <div className="grid sm:grid-cols-2 gap-3 sm:gap-5 max-w-6xl mx-auto">
                    {grupo.map((b) => (
                      <Fotografia key={b.id} bloco={b} sizes="(max-width: 640px) 100vw, 45vw" />
                    ))}
                  </div>
                </Reveal>
              </section>
            )
          }

          if (primeiro.largura === 'cheia') {
            return (
              <section key={primeiro.id} className="py-4 sm:py-8">
                <Reveal>
                  <Fotografia bloco={primeiro} sizes="100vw" />
                </Reveal>
              </section>
            )
          }

          return (
            <section key={primeiro.id} className="container-px py-4 sm:py-8">
              <Reveal>
                <div className="max-w-4xl mx-auto">
                  <Fotografia bloco={primeiro} sizes="(max-width: 1024px) 100vw, 56rem" />
                </div>
              </Reveal>
            </section>
          )
        })}
      </div>

      {/* ── A frase deles ──────────────────────────────────── */}
      {h.quote?.trim() && (
        <section className="container-px py-24 sm:py-36">
          <Reveal>
            <blockquote className="max-w-3xl mx-auto text-center">
              <p
                className="leading-[1.5] text-titanium/85"
                style={{ fontSize: 'clamp(1.4rem, 3.2vw, 2.4rem)' }}
              >
                “{h.quote}”
              </p>
              {h.quoteAuthor && (
                <footer className="label-sm mt-8">{h.quoteAuthor}</footer>
              )}
            </blockquote>
          </Reveal>
        </section>
      )}

      {/* ── Marcar, e voltar ───────────────────────────────── */}
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
          <div className="mt-12">
            <Link
              to={link('stories')}
              className="label-sm alvo-toque hover:text-titanium/85 transition-colors"
            >
              ← {t.stories.back}
            </Link>
          </div>
        </div>
      </section>
    </article>
  )
}
