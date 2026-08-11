import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, MapPin, Phone } from 'lucide-react'
import Reveal from '../lib/Reveal'
import InstagramIcon from '../lib/InstagramIcon'

export default function Contact() {
  const [sent, setSent] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    service: 'Casamentos',
    message: '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSent(true)
  }

  return (
    <div className="pt-28 sm:pt-36 pb-20 sm:pb-28">
      {/* Header */}
      <section className="container-px mb-12 sm:mb-20">
        <Reveal>
          <span className="label-sm">Contacto</span>
          <h1 className="mt-4 max-w-2xl leading-[1.05]" style={{ fontSize: 'clamp(2.2rem, 6vw, 5rem)' }}>
            Vamos falar sobre o vosso projeto.
          </h1>
        </Reveal>
      </section>

      <section className="container-px grid md:grid-cols-[1fr_1.3fr] gap-10 sm:gap-16">
        {/* Left: info */}
        <Reveal>
          <div className="space-y-8">
            {/* Quick contact box */}
            <div className="border border-white/10 rounded-2xl p-6 sm:p-7 hover:border-white/20 transition-colors space-y-3">
              <p className="label-sm mb-4">Resposta rápida</p>
              <a
                href="https://ig.me/m/proj3ct.nebula"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 bg-white/[0.06] hover:bg-white/[0.1] px-5 py-3.5 rounded-xl text-sm transition-colors min-h-[48px]"
              >
                <InstagramIcon size={18} className="shrink-0 text-titanium/70" />
                <div>
                  <div className="text-[11px] uppercase tracking-[0.15em] text-titanium/50 leading-none mb-0.5">Instagram</div>
                  <div className="text-titanium/90">@proj3ct.nebula</div>
                </div>
              </a>
              <a
                href="mailto:nebula.pdstudio@gmail.com"
                className="flex items-center gap-3 bg-white/[0.06] hover:bg-white/[0.1] px-5 py-3.5 rounded-xl text-sm transition-colors min-h-[48px]"
              >
                <Mail size={18} className="shrink-0 text-titanium/70" />
                <div>
                  <div className="text-[11px] uppercase tracking-[0.15em] text-titanium/50 leading-none mb-0.5">Email</div>
                  <div className="text-titanium/90">nebula.pdstudio@gmail.com</div>
                </div>
              </a>
              <p className="text-titanium/35 text-xs pt-1">Respondemos em menos de 24 horas</p>
            </div>

            {/* Other contact details */}
            <div className="space-y-5">
              <div>
                <p className="label-sm mb-2">Telefone</p>
                <a
                  href="tel:+351900000000"
                  className="flex items-center gap-3 text-sm sm:text-base py-1 text-titanium/80 hover:text-titanium transition-colors"
                >
                  <Phone size={16} className="shrink-0 text-titanium/40" />
                  +351 900 000 000
                </a>
              </div>
              <div>
                <p className="label-sm mb-2">Localização</p>
                <p className="flex items-center gap-3 text-sm sm:text-base py-1 text-titanium/80">
                  <MapPin size={16} className="shrink-0 text-titanium/40" />
                  Lisboa & Portalegre, Portugal
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Right: form */}
        <Reveal delay={0.15}>
          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="border border-white/10 rounded-2xl p-8 sm:p-12 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-white/[0.07] flex items-center justify-center mx-auto mb-6">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 className="text-2xl mb-3">Mensagem enviada.</h3>
              <p className="text-titanium/55 text-sm">Obrigado pelo contacto — respondemos em breve.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-7">
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="label-sm block mb-3">Nome</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-transparent border-b border-white/15 py-3 text-base outline-none focus:border-titanium/60 transition-colors placeholder:text-titanium/25"
                    placeholder="O vosso nome"
                  />
                </div>
                <div>
                  <label className="label-sm block mb-3">Email</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-transparent border-b border-white/15 py-3 text-base outline-none focus:border-titanium/60 transition-colors placeholder:text-titanium/25"
                    placeholder="email@exemplo.pt"
                  />
                </div>
              </div>

              <div>
                <label className="label-sm block mb-3">Serviço</label>
                <select
                  value={form.service}
                  onChange={(e) => setForm({ ...form, service: e.target.value })}
                  className="w-full bg-eerie border-b border-white/15 py-3 text-base outline-none focus:border-titanium/60 transition-colors text-titanium/80"
                >
                  <option>Casamentos</option>
                  <option>Maternidade</option>
                  <option>Eventos</option>
                </select>
              </div>

              <div>
                <label className="label-sm block mb-3">Mensagem</label>
                <textarea
                  required
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full bg-transparent border-b border-white/15 py-3 outline-none focus:border-titanium/60 transition-colors resize-none text-base placeholder:text-titanium/25"
                  placeholder="Contai-nos sobre o vosso dia especial, data prevista, localização..."
                />
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-titanium text-eerie px-9 py-5 rounded-full text-[11px] uppercase tracking-[0.2em] font-semibold group active:scale-95 hover:gap-5 transition-all min-h-[50px]"
              >
                Enviar mensagem
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform group-hover:translate-x-1">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
          )}
        </Reveal>
      </section>
    </div>
  )
}
