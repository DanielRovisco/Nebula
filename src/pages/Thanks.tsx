import { Link, useLocation } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Reveal from '../lib/Reveal'
import Picture from '../lib/Picture'
import Seo from '../lib/Seo'
import { CONTACT } from '../lib/site'
import { useLink, useT } from '../lib/i18n'

/**
 * Página de confirmação depois do formulário.
 *
 * É uma página com endereço próprio, e não uma mensagem que aparece no sítio do
 * formulário, por duas razões: dá para medir quantos pedidos entram de verdade
 * (é a única página que só se vê depois de enviar), e dá para lá voltar ou
 * partilhar sem ficar um formulário meio preenchido no caminho.
 *
 * Vai a `noindex`: não faz sentido alguém aterrar aqui vindo do Google.
 */
export default function Thanks() {
  const t = useT()
  const link = useLink()
  const { state } = useLocation()
  const via = (state as { via?: string } | null)?.via

  return (
    <div className="pt-28 sm:pt-36 pb-20 sm:pb-28">
      <Seo title={t.thanks.seoTitle} description={t.thanks.seoDescription} noindex />

      <section className="container-px grid md:grid-cols-2 gap-10 sm:gap-16 items-center">
        <Reveal>
          <div className="w-12 h-12 rounded-full bg-white/[0.07] flex items-center justify-center mb-8">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <span className="label-sm">{t.thanks.label}</span>
          <h1 className="mt-4 leading-[1.05]" style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}>
            {t.thanks.title}
          </h1>

          {/*
            Pelo caminho do email não há como confirmar que a mensagem chegou —
            só que o programa de email foi aberto. O texto reflete isso em vez de
            afirmar o que não sabemos.
          */}
          <p className="text-titanium/55 leading-relaxed mt-6 max-w-md">
            {via === 'email' ? t.thanks.mailto : t.thanks.sent}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <a href={`mailto:${CONTACT.email}`} className="text-titanium/60 hover:text-titanium transition-colors break-all">
              {CONTACT.email}
            </a>
            <a
              href={CONTACT.instagramDm}
              target="_blank"
              rel="noreferrer"
              className="text-titanium/60 hover:text-titanium transition-colors"
            >
              {t.contact.instagramDm}
            </a>
          </div>

          <p className="label-sm mt-12 mb-4">{t.thanks.next}</p>
          <div className="flex flex-wrap gap-2.5">
            <Link
              to={link('portfolio')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-[11px] uppercase tracking-[0.12em] border border-white/15 text-titanium/60 hover:border-white/40 hover:text-titanium/85 transition-all min-h-[44px]"
            >
              {t.thanks.seePortfolio} <ArrowRight size={12} />
            </Link>
            <Link
              to={link('services')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-[11px] uppercase tracking-[0.12em] border border-white/15 text-titanium/60 hover:border-white/40 hover:text-titanium/85 transition-all min-h-[44px]"
            >
              {t.thanks.seeServices} <ArrowRight size={12} />
            </Link>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <Picture
            name="maternity-sunset-couple"
            alt="Casal ao pôr do sol"
            sizes="(max-width: 768px) 100vw, 50vw"
            className="w-full rounded-2xl object-cover object-[50%_30%]"
            style={{ height: 'clamp(38vh, 52vh, 62vh)' }}
          />
        </Reveal>
      </section>
    </div>
  )
}
