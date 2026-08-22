import { Link } from 'react-router-dom'
import Reveal from '../lib/Reveal'
import Seo from '../lib/Seo'
import { CONTACT } from '../lib/site'
import { useLink, useT } from '../lib/i18n'
import Breadcrumbs from '../components/Breadcrumbs'

/**
 * Política de privacidade.
 *
 * O texto vive no dicionário, como o resto do site — mas aqui isso vale a
 * dobrar: é um documento com valor legal, e ter as duas versões lado a lado no
 * mesmo ficheiro é o que garante que uma alteração numa não fica esquecida na
 * outra.
 *
 * Falta identificar a entidade responsável (nome fiscal, NIF, morada) assim que
 * houver empresa constituída ou atividade aberta — o RGPD obriga a isso e um
 * nome de marca sozinho não chega.
 */
export default function Privacy() {
  const t = useT()
  const link = useLink()

  return (
    <div className="pt-28 sm:pt-36 pb-20 sm:pb-28">
      <Seo title={t.privacy.seoTitle} description={t.privacy.seoDescription} />

      <section className="container-px mb-14 sm:mb-20">
        <Breadcrumbs items={[{ label: t.footer.privacy }]} />
        <Reveal>
          <span className="label-sm">{t.privacy.label}</span>
          <h1 className="mt-4 max-w-3xl leading-[1.05]" style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}>
            {t.privacy.title}
          </h1>
          <p className="text-titanium/60 text-sm mt-6">
            {t.privacy.updated} {t.privacy.updatedAt}
          </p>
        </Reveal>
      </section>

      <section className="container-px max-w-3xl">
        {t.privacy.sections.map((s, i) => (
          <Reveal key={s.title} delay={Math.min(i * 0.05, 0.2)}>
            <div className="py-8 sm:py-10 border-t border-white/10">
              <h2 className="text-xl sm:text-2xl mb-5">{s.title}</h2>
              <div className="space-y-4 text-titanium/55 leading-relaxed text-[15px]">
                {s.paragraphs.map((p) => (
                  <p key={p}>
                    {p}
                    {/* Os parágrafos que acabam em ":" são os que apontam para
                        o email — assim o endereço não fica repetido no texto de
                        cada língua. */}
                    {p.endsWith(':') && (
                      <>
                        {' '}
                        <a
                          href={`mailto:${CONTACT.email}`}
                          className="underline underline-offset-4 hover:text-titanium break-all"
                        >
                          {CONTACT.email}
                        </a>
                      </>
                    )}
                  </p>
                ))}

                {'list' in s && s.list && (
                  <ul className="space-y-2 pt-1">
                    {s.list.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span aria-hidden="true" className="text-titanium/40 shrink-0">·</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                )}

                {'after' in s && s.after && <p>{s.after}</p>}
              </div>
            </div>
          </Reveal>
        ))}

        <div className="border-t border-white/10 pt-10">
          <Link to={link('contact')} className="label-sm hover:text-titanium/70 transition-colors">
            ← {t.common.talkToUs}
          </Link>
        </div>
      </section>
    </div>
  )
}
