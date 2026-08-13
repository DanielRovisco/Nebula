import { Link } from 'react-router-dom'
import { Aperture, ArrowRight, Compass, Sparkle } from 'lucide-react'
import Reveal from '../lib/Reveal'
import Picture from '../lib/Picture'
import Seo from '../lib/Seo'
import { CONTACT, absoluteUrl } from '../lib/site'

const TEAM = [
  { name: 'Daniel', role: 'Videógrafo & Filmmaker', sub: 'Operador de Drone' },
  { name: 'Camila', role: 'Fotógrafa', sub: 'Sessões editoriais & maternidade' },
  { name: 'Patrick', role: 'Fotógrafo', sub: 'Casamentos & eventos' },
]

const VALUES = [
  {
    icon: Sparkle,
    title: 'Criatividade',
    desc: 'Cada projeto é uma narrativa própria — nunca uma fórmula repetida. Desenhamos cada história a partir do zero.',
  },
  {
    icon: Compass,
    title: 'Rigor',
    desc: 'Profissionalismo em cada detalhe, do primeiro contacto à entrega final. Sem compromissos.',
  },
  {
    icon: Aperture,
    title: 'Autenticidade',
    desc: 'Capturamos o real, sem artifícios — emoção genuína em cada fotograma, sem encenações.',
  },
]

export default function About() {
  return (
    <div className="pt-28 sm:pt-36 pb-20 sm:pb-28">
      <Seo
        title="Sobre nós — NEBULA Fotografia & Vídeo"
        description="Somos três criadores visuais entre Lisboa e Portalegre: fotografia editorial, vídeo cinematográfico 4K e drone. Criatividade, rigor e autenticidade."
        image={absoluteUrl('/brand/portfolio/palace-dome-1440.webp')}
      />

      {/* Header */}
      <section className="container-px mb-14 sm:mb-28">
        <Reveal>
          <span className="label-sm">Sobre nós</span>
          <h1 className="mt-4 max-w-3xl leading-[1.05]" style={{ fontSize: 'clamp(2.2rem, 6vw, 5rem)' }}>
            O nascimento de algo novo, em cada projeto.
          </h1>
        </Reveal>
      </section>

      {/* Intro + Image */}
      <section className="container-px grid md:grid-cols-2 gap-8 sm:gap-14 mb-16 sm:mb-32">
        <Reveal>
          <Picture
            name="palace-dome"
            alt="Cúpula de palácio fotografada de baixo — trabalho da equipa NEBULA"
            sizes="(max-width: 768px) 100vw, 50vw"
            className="w-full rounded-2xl object-cover object-center"
            style={{ height: 'clamp(40vh, 55vh, 65vh)' }}
          />
        </Reveal>
        <Reveal delay={0.15} className="flex flex-col justify-center">
          <p
            className="font-serif italic text-titanium/88 leading-[1.2] mb-6"
            style={{ fontSize: 'clamp(1.3rem, 2.5vw, 2rem)' }}
          >
            "Assim como as nebulosas representam o nascimento de algo extraordinário,
            a NEBULA transforma momentos em narrativas visuais que duram para sempre."
          </p>
          <p className="text-titanium/55 leading-relaxed text-sm mb-8">
            Somos uma equipa de três pessoas dedicadas à produção audiovisual com rigor e autenticidade.
            Cada projeto é abordado como único — com a criatividade e a precisão que merece.
            Baseados em Lisboa e Portalegre, trabalhamos em todo o Portugal.
          </p>
          <Link
            to="/contacto"
            className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-titanium/55 border-b border-titanium/25 pb-1 hover:border-titanium/55 hover:text-titanium/85 transition-all w-fit"
          >
            Fala connosco <ArrowRight size={12} />
          </Link>
        </Reveal>
      </section>

      <div className="container-px"><div className="hairline mb-16 sm:mb-32" /></div>

      {/* Values */}
      <section className="container-px mb-16 sm:mb-32">
        <Reveal className="mb-10 sm:mb-16">
          <span className="label-sm">Valores</span>
          <h2 className="text-3xl sm:text-5xl mt-3">O que nos guia</h2>
        </Reveal>
        <div className="grid sm:grid-cols-3 gap-10 sm:gap-12">
          {VALUES.map((v, i) => (
            <Reveal key={v.title} delay={i * 0.12}>
              <div className="border-t border-white/[0.12] pt-6 sm:pt-7">
                <v.icon size={26} strokeWidth={1.3} className="mb-6 text-titanium/70" />
                <h3 className="text-xl mb-3">{v.title}</h3>
                <p className="text-titanium/52 text-sm leading-relaxed">{v.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <div className="container-px"><div className="hairline mb-16 sm:mb-32" /></div>

      {/* Team */}
      <section className="container-px mb-16 sm:mb-28">
        <Reveal className="mb-10 sm:mb-16">
          <span className="label-sm">Equipa</span>
          <h2 className="text-3xl sm:text-5xl mt-3">Quem está por detrás</h2>
        </Reveal>
        <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
          {TEAM.map((m, i) => (
            <Reveal key={m.name} delay={i * 0.12}>
              <div className="border border-white/10 rounded-2xl p-7 sm:p-8 hover:border-white/20 transition-colors">
                <div className="w-12 h-12 rounded-full bg-white/[0.07] flex items-center justify-center mb-6">
                  <span className="text-lg font-semibold text-titanium/70">{m.name[0]}</span>
                </div>
                <h3 className="text-2xl mb-1">{m.name}</h3>
                <p className="text-titanium/65 text-sm">{m.role}</p>
                <p className="text-titanium/38 text-xs mt-1">{m.sub}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Instagram CTA */}
      <section className="container-px">
        <Reveal>
          <div className="border border-white/10 rounded-2xl p-8 sm:p-12 text-center">
            <span className="label-sm">Instagram</span>
            <h2 className="text-2xl sm:text-4xl mt-4 mb-4">Segue a nossa história</h2>
            <p className="text-titanium/50 text-sm mb-8">
              Bastidores, trabalhos recentes e momentos do dia-a-dia em{' '}
              <span className="text-titanium/80">@proj3ct.nebula</span>
            </p>
            <a
              href={CONTACT.instagram}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-3 border border-white/20 px-8 py-4 rounded-full text-[11px] uppercase tracking-[0.2em] hover:border-white/45 transition-colors active:scale-95"
            >
              Ver no Instagram
              <ArrowRight size={13} />
            </a>
          </div>
        </Reveal>
      </section>
    </div>
  )
}
