import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Reveal from '../lib/Reveal'
import Picture from '../lib/Picture'
import Seo from '../lib/Seo'

const ATALHOS = [
  { to: '/portfolio', label: 'Portfólio' },
  { to: '/servicos', label: 'Serviços & packs' },
  { to: '/sobre', label: 'Sobre nós' },
  { to: '/galeria', label: 'Área de cliente' },
]

/**
 * Rota desconhecida. Não é um beco: mostra os caminhos todos e uma fotografia,
 * que é ao que a pessoa veio. O `noindex` do Seo evita que o Google guarde
 * links partidos como se fossem páginas do site.
 */
export default function NotFound() {
  return (
    <div className="pt-28 sm:pt-36 pb-20 sm:pb-28">
      <Seo
        title="Página não encontrada — NEBULA"
        description="A página que procuras não existe ou mudou de sítio."
        noindex
      />

      <section className="container-px grid md:grid-cols-2 gap-10 sm:gap-16 items-center">
        <Reveal>
          <span className="label-sm">Erro 404</span>
          <h1 className="mt-4 leading-[1.05]" style={{ fontSize: 'clamp(2.2rem, 6vw, 4.5rem)' }}>
            Esta página perdeu-se no escuro.
          </h1>
          <p className="text-titanium/55 leading-relaxed mt-6 max-w-md">
            O endereço não existe ou mudou de sítio. Fica aqui o caminho de volta
            — e, já agora, o que vale mesmo a pena ver.
          </p>

          <nav className="mt-10 flex flex-wrap gap-2.5" aria-label="Páginas principais">
            {ATALHOS.map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="px-6 py-3 rounded-full text-[11px] uppercase tracking-[0.12em] border border-white/15 text-titanium/60 hover:border-white/40 hover:text-titanium/85 transition-all active:scale-95 min-h-[44px] flex items-center"
              >
                {a.label}
              </Link>
            ))}
          </nav>

          <Link
            to="/contacto"
            className="mt-10 inline-flex items-center gap-3 bg-titanium text-eerie px-8 py-4 rounded-full text-[11px] uppercase tracking-[0.2em] font-semibold group hover:gap-5 transition-all active:scale-95"
          >
            Falar connosco
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>

        <Reveal delay={0.1}>
          <Picture
            name="editorial-dramatic"
            alt="Retrato editorial com iluminação dramática"
            sizes="(max-width: 768px) 100vw, 50vw"
            className="w-full rounded-2xl object-cover object-[50%_20%]"
            style={{ height: 'clamp(38vh, 52vh, 62vh)' }}
          />
        </Reveal>
      </section>
    </div>
  )
}
