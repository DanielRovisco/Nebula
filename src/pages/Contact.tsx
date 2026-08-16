import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, MapPin } from 'lucide-react'
import Reveal from '../lib/Reveal'
import Seo from '../lib/Seo'
import InstagramIcon from '../lib/InstagramIcon'
import { CONTACT } from '../lib/site'
import { useLink, useT } from '../lib/i18n'

// Endpoint opcional de recolha de formulários (Formspree, Web3Forms, etc.).
// Se estiver definido, a mensagem é submetida por POST e o visitante nunca sai
// do site. Sem ele, o formulário recorre ao cliente de email do visitante —
// que funciona sempre e sem serviços de terceiros, mas exige um passo extra.
const ENDPOINT = import.meta.env.VITE_CONTACT_ENDPOINT as string | undefined

// Os valores do <select> seguem a língua do visitante: é o que vai no email,
// e um pedido em inglês a dizer "Casamentos" lê-se mal dos dois lados.
const SERVICE_KEYS = ['casamentos', 'maternidade', 'eventos'] as const

type Status = 'idle' | 'sending' | 'sent' | 'mailto' | 'error'

export default function Contact() {
  const t = useT()
  const link = useLink()
  const servicos = SERVICE_KEYS.map((k) => t.home.services[k].title)
  const [status, setStatus] = useState<Status>('idle')
  const [form, setForm] = useState({
    name: '',
    email: '',
    service: '',
    // Data e local do evento: são sempre as duas primeiras perguntas de
    // qualquer orçamento. Ficam opcionais — quem ainda não tem data marcada não
    // pode ficar impedido de escrever.
    date: '',
    location: '',
    message: '',
  })

  /** Data no formato português, que é como ela vai ser lida no email. */
  function dataLegivel() {
    if (!form.date) return ''
    const [ano, mes, dia] = form.date.split('-')
    return `${dia}/${mes}/${ano}`
  }

  function buildMailto() {
    const m = t.contact.mailBody
    const subject = t.contact.mailSubject(form.service || servicos[0], form.name)
    const body = [
      `${m.name}: ${form.name}`,
      `${m.email}: ${form.email}`,
      `${m.service}: ${form.service || servicos[0]}`,
      `${m.date}: ${dataLegivel() || m.undefined_}`,
      `${m.location}: ${form.location || m.undefined_}`,
      '',
      form.message,
    ].join('\n')
    return `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!ENDPOINT) {
      // Abre o cliente de email já preenchido. Não há como confirmar o envio a
      // partir daqui, por isso o texto de sucesso reflete exatamente isso em
      // vez de afirmar que a mensagem chegou.
      window.location.assign(buildMailto())
      setStatus('mailto')
      return
    }

    setStatus('sending')
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          service: form.service || servicos[0],
          date: dataLegivel(),
          location: form.location,
          message: form.message,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  const inputClass =
    'w-full bg-transparent border-b border-white/15 py-3 text-base outline-none focus:border-titanium/60 transition-colors placeholder:text-titanium/25'

  return (
    <div className="pt-28 sm:pt-36 pb-20 sm:pb-28">
      <Seo
        title={t.contact.seoTitle}
        description={t.contact.seoDescription}
      />

      {/* Header */}
      <section className="container-px mb-12 sm:mb-20">
        <Reveal>
          <span className="label-sm">{t.contact.label}</span>
          <h1 className="mt-4 max-w-2xl leading-[1.05]" style={{ fontSize: 'clamp(2.2rem, 6vw, 5rem)' }}>
            {t.contact.title}
          </h1>
        </Reveal>
      </section>

      <section className="container-px grid md:grid-cols-[1fr_1.3fr] gap-10 sm:gap-16">
        {/* Left: info */}
        <Reveal>
          <div className="space-y-8">
            {/* Quick contact box */}
            <div className="border border-white/10 rounded-2xl p-6 sm:p-7 hover:border-white/20 transition-colors space-y-3">
              <p className="label-sm mb-4">{t.contact.quickLabel}</p>
              <a
                href={CONTACT.instagramDm}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 bg-white/[0.06] hover:bg-white/[0.1] px-5 py-3.5 rounded-xl text-sm transition-colors min-h-[48px]"
              >
                <InstagramIcon size={18} className="shrink-0 text-titanium/70" />
                <div>
                  <div className="text-[11px] uppercase tracking-[0.15em] text-titanium/50 leading-none mb-0.5">Instagram</div>
                  <div className="text-titanium/90">{CONTACT.instagramHandle}</div>
                </div>
              </a>
              <a
                href={`mailto:${CONTACT.email}`}
                className="flex items-center gap-3 bg-white/[0.06] hover:bg-white/[0.1] px-5 py-3.5 rounded-xl text-sm transition-colors min-h-[48px]"
              >
                <Mail size={18} className="shrink-0 text-titanium/70" />
                <div>
                  <div className="text-[11px] uppercase tracking-[0.15em] text-titanium/50 leading-none mb-0.5">Email</div>
                  <div className="text-titanium/90 break-all">{CONTACT.email}</div>
                </div>
              </a>
              <p className="text-titanium/35 text-xs pt-1">{t.contact.replyTime}</p>
            </div>

            {/* Other contact details */}
            <div className="space-y-5">
              <div>
                <p className="label-sm mb-2">{t.contact.locationLabel}</p>
                <p className="flex items-center gap-3 text-sm sm:text-base py-1 text-titanium/80">
                  <MapPin size={16} className="shrink-0 text-titanium/40" />
                  {t.contact.location}
                </p>
              </div>
              <div>
                <p className="label-sm mb-2">{t.contact.howLabel}</p>
                <p className="text-sm text-titanium/55 leading-relaxed">{t.contact.how}</p>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Right: form */}
        <Reveal delay={0.15}>
          {status === 'sent' || status === 'mailto' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="border border-white/10 rounded-2xl p-8 sm:p-12 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-white/[0.07] flex items-center justify-center mx-auto mb-6">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              {status === 'sent' ? (
                <>
                  <h2 className="text-2xl mb-3">{t.contact.sentTitle}</h2>
                  <p className="text-titanium/55 text-sm">{t.contact.sentText}</p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl mb-3">{t.contact.mailtoTitle}</h2>
                  <p className="text-titanium/55 text-sm">{t.contact.mailtoText}</p>
                  <p className="text-titanium/40 text-xs mt-5">
                    {t.contact.mailtoFallback}{' '}
                    <a href={`mailto:${CONTACT.email}`} className="underline break-all">
                      {CONTACT.email}
                    </a>{' '}
                    {t.contact.or}{' '}
                    <a href={CONTACT.instagramDm} target="_blank" rel="noreferrer" className="underline">
                      {t.contact.instagramDm}
                    </a>
                    .
                  </p>
                </>
              )}
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-7">
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="label-sm block mb-3" htmlFor="contact-name">{t.contact.name}</label>
                  <input
                    id="contact-name"
                    name="name"
                    autoComplete="name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={inputClass}
                    placeholder={t.contact.namePlaceholder}
                  />
                </div>
                <div>
                  <label className="label-sm block mb-3" htmlFor="contact-email">{t.contact.email}</label>
                  <input
                    id="contact-email"
                    name="email"
                    autoComplete="email"
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={inputClass}
                    placeholder="email@exemplo.pt"
                  />
                </div>
              </div>

              <div>
                <label className="label-sm block mb-3" htmlFor="contact-service">{t.contact.service}</label>
                <select
                  id="contact-service"
                  name="service"
                  value={form.service || servicos[0]}
                  onChange={(e) => setForm({ ...form, service: e.target.value })}
                  className="w-full bg-eerie border-b border-white/15 py-3 text-base outline-none focus:border-titanium/60 transition-colors text-titanium/80"
                >
                  {servicos.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="label-sm block mb-3" htmlFor="contact-date">
                    {t.contact.date}{' '}
                    <span className="normal-case tracking-normal text-titanium/25">{t.contact.optional}</span>
                  </label>
                  <input
                    id="contact-date"
                    name="date"
                    type="date"
                    // Datas passadas não fazem sentido num pedido de orçamento.
                    min={new Date().toISOString().slice(0, 10)}
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className={`${inputClass} [color-scheme:dark]`}
                  />
                </div>
                <div>
                  <label className="label-sm block mb-3" htmlFor="contact-location">
                    {t.contact.location_}{' '}
                    <span className="normal-case tracking-normal text-titanium/25">{t.contact.optional}</span>
                  </label>
                  <input
                    id="contact-location"
                    name="location"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className={inputClass}
                    placeholder={t.contact.locationPlaceholder}
                  />
                </div>
              </div>

              <div>
                <label className="label-sm block mb-3" htmlFor="contact-message">{t.contact.message}</label>
                <textarea
                  id="contact-message"
                  name="message"
                  required
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full bg-transparent border-b border-white/15 py-3 outline-none focus:border-titanium/60 transition-colors resize-none text-base placeholder:text-titanium/25"
                  placeholder={t.contact.messagePlaceholder}
                />
              </div>

              {/* O RGPD exige que se diga para que servem os dados no momento em
                  que são pedidos, não só numa página escondida. */}
              <p className="text-xs text-titanium/35 leading-relaxed">
                {t.contact.privacyNote}{' '}
                <Link to={link('privacy')} className="underline underline-offset-4 hover:text-titanium/70">
                  {t.contact.privacyLink}
                </Link>
                .
              </p>

              {status === 'error' && (
                <p role="alert" className="text-sm text-titanium/80 border border-white/15 rounded-xl p-4">
                  {t.contact.errorText}{' '}
                  <a href={`mailto:${CONTACT.email}`} className="underline break-all">
                    {CONTACT.email}
                  </a>{' '}
                  {t.contact.or}{' '}
                  <a href={CONTACT.instagramDm} target="_blank" rel="noreferrer" className="underline">
                    {t.contact.instagramDm}
                  </a>
                  .
                </p>
              )}

              <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-titanium text-eerie px-9 py-5 rounded-full text-[11px] uppercase tracking-[0.2em] font-semibold group active:scale-95 hover:gap-5 transition-all min-h-[50px] disabled:opacity-60 disabled:cursor-wait"
              >
                {status === 'sending' ? t.contact.sending : t.contact.submit}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform group-hover:translate-x-1" aria-hidden="true">
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
