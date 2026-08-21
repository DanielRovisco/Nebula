import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, MapPin } from 'lucide-react'
import Reveal from '../lib/Reveal'
import Seo from '../lib/Seo'
import InstagramIcon from '../lib/InstagramIcon'
import { CONTACT } from '../lib/site'
import { useLink, useT } from '../lib/i18n'
import Breadcrumbs from '../components/Breadcrumbs'
import { breadcrumbJsonLd } from '../lib/breadcrumbJsonLd'
import { track } from '../lib/track'

// Endpoint opcional de recolha de formulários (Formspree, Web3Forms, etc.).
// Se estiver definido, a mensagem é submetida por POST e o visitante nunca sai
// do site. Sem ele, o formulário recorre ao cliente de email do visitante —
// que funciona sempre e sem serviços de terceiros, mas exige um passo extra.
const ENDPOINT = import.meta.env.VITE_CONTACT_ENDPOINT as string | undefined

// Os valores do <select> seguem a língua do visitante: é o que vai no email,
// e um pedido em inglês a dizer "Casamentos" lê-se mal dos dois lados.
const SERVICE_KEYS = ['casamentos', 'maternidade', 'eventos'] as const

type Status = 'idle' | 'sending' | 'error'

/** Rascunho do que está a ser escrito, no browser de quem escreve. */
const DRAFT_KEY = 'nebula-contacto'

type Campos = {
  name: string
  email: string
  service: string
  date: string
  location: string
  message: string
}

const VAZIO: Campos = { name: '', email: '', service: '', date: '', location: '', message: '' }

function lerRascunho(): Campos | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const guardado = JSON.parse(raw) as Partial<Campos>
    // Um rascunho sem nada escrito não é rascunho.
    if (!Object.values(guardado).some((v) => typeof v === 'string' && v.trim())) return null
    return { ...VAZIO, ...guardado }
  } catch {
    return null
  }
}

export default function Contact() {
  const t = useT()
  const link = useLink()
  const navigate = useNavigate()
  const servicos = SERVICE_KEYS.map((k) => t.home.services[k].title)
  const [status, setStatus] = useState<Status>('idle')

  // Data e local do evento são opcionais — quem ainda não tem data marcada não
  // pode ficar impedido de escrever.
  // Lido uma única vez, na montagem: se relesse a cada render, o que a pessoa
  // está a escrever agora seria substituído pelo que estava guardado.
  const [rascunho] = useState(lerRascunho)
  const [form, setForm] = useState<Campos>(rascunho ?? VAZIO)
  const [tocado, setTocado] = useState<Partial<Record<keyof Campos, boolean>>>({})

  // Armadilha para robôs: um campo que ninguém vê e que só um preenchimento
  // automático toca. E o instante em que o formulário apareceu — um humano não
  // escreve tudo isto em três segundos.
  const [armadilha, setArmadilha] = useState('')
  // Um humano toca nos campos antes de enviar — mesmo com preenchimento
  // automático, o browser dispara os eventos. Um robô que submeta o formulário
  // por código nunca o faz.
  //
  // Cheguei a descartar também os envios feitos em menos de três segundos, e
  // estava errado: alguém com o preenchimento automático do browser envia num
  // instante, e o castigo era a mensagem desaparecer sem ninguém saber. Perder
  // um pedido real é muito pior do que deixar passar spam.
  const [interagiu, setInteragiu] = useState(false)

  // Guarda o que está escrito, para não se perder ao sair da página à procura
  // da data. Fica no dispositivo de quem escreve e nunca é enviado por si só.
  useEffect(() => {
    const vazio = !Object.values(form).some((v) => v.trim())
    try {
      if (vazio) localStorage.removeItem(DRAFT_KEY)
      else localStorage.setItem(DRAFT_KEY, JSON.stringify(form))
    } catch { /* sem localStorage perde-se o rascunho; não é grave */ }
  }, [form])

  /** Erros por campo. Só se mostram depois de o campo ter sido visitado. */
  const erros: Partial<Record<keyof Campos, string>> = {}
  if (!form.name.trim()) erros.name = t.contact.errors.name
  // Validação deliberadamente frouxa: "algo@algo.algo". Regras apertadas
  // recusam endereços válidos e não apanham os inválidos que interessam.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) erros.email = t.contact.errors.email
  if (form.message.trim().length < 10) erros.message = t.contact.errors.message
  if (form.date && form.date < new Date().toISOString().slice(0, 10)) erros.date = t.contact.errors.pastDate

  /*
    O campo de mensagem cresce com o texto em vez de ficar preso em cinco
    linhas com barra de deslocamento por dentro. Quem escreve a descrever um
    casamento escreve mais do que cabe numa caixa pequena, e não ver o que já
    escreveu faz reler e encurtar — perde-se justamente o detalhe que ajuda a
    responder bem.

    A altura é medida a partir do `scrollHeight`, e o `auto` antes é o que
    permite a caixa também encolher quando se apaga texto: sem ele, o
    scrollHeight nunca desce.
  */
  const areaRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [form.message])

  const erro = (campo: keyof Campos) => (tocado[campo] ? erros[campo] : undefined)
  const visitar = (campo: keyof Campos) => setTocado((v) => ({ ...v, [campo]: true }))

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

    // A validação vem primeiro, e é por uma razão concreta: quem carrega em
    // enviar sem ter tocado em nada tem de ver o que falta, não ser tratado
    // como robô. Só depois de o formulário estar preenchido é que faz sentido
    // perguntar se foi mesmo uma pessoa a preenchê-lo.
    setTocado({ name: true, email: true, message: true, date: true })
    if (Object.keys(erros).length > 0) return

    // Robô apanhado: nem envia nem avisa. Dizer "detetámos um robô" só ensina
    // o próximo a contornar.
    if (armadilha || !interagiu) {
      navigate(link('thanks'), { state: { via: 'form' } })
      return
    }

    limparRascunho()

    if (!ENDPOINT) {
      // Abre o cliente de email já preenchido. Não há como confirmar o envio a
      // partir daqui, por isso o texto de sucesso reflete exatamente isso em
      // vez de afirmar que a mensagem chegou.
      window.location.assign(buildMailto())
      track('formulario_email')
      navigate(link('thanks'), { state: { via: 'email' } })
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
      track('formulario_enviado', { servico: form.service || servicos[0] })
      navigate(link('thanks'), { state: { via: 'form' } })
    } catch {
      setStatus('error')
    }
  }

  function limparRascunho() {
    try {
      localStorage.removeItem(DRAFT_KEY)
    } catch { /* nada a fazer */ }
  }

  const inputClass =
    'w-full bg-transparent border-b border-white/15 py-3 text-base outline-none focus:border-titanium/60 transition-colors placeholder:text-titanium/55'

  return (
    <div className="pt-28 sm:pt-36 pb-20 sm:pb-28">
      <Seo
        title={t.contact.seoTitle}
        description={t.contact.seoDescription}
        jsonLd={breadcrumbJsonLd([
          { nome: t.nav.home, caminho: link('home') },
          { nome: t.nav.contact, caminho: link('contact') },
        ])}
      />

      {/* Header */}
      <section className="container-px mb-12 sm:mb-20">
        <Breadcrumbs items={[{ label: t.nav.contact }]} />
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
                onClick={() => track('cta_instagram', { onde: 'contacto' })}
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
              <p className="text-titanium/55 text-xs pt-1">{t.contact.replyTime}</p>
            </div>

            {/* Other contact details */}
            <div className="space-y-5">
              <div>
                <p className="label-sm mb-2">{t.contact.locationLabel}</p>
                <p className="flex items-center gap-3 text-sm sm:text-base py-1 text-titanium/80">
                  <MapPin size={16} className="shrink-0 text-titanium/55" />
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
          <form
            onSubmit={handleSubmit}
            noValidate
            onInput={() => setInteragiu(true)}
            className="space-y-7"
          >
            {rascunho && (
              <p className="text-xs text-titanium/55 border border-white/10 rounded-xl p-3">
                {t.contact.draftRestored}
              </p>
            )}

            {/*
              Campo-armadilha. Está escondido de quem vê e de quem ouve, e fora
              da ordem de tabulação — só um robô a preencher tudo lhe toca.
            */}
            <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
              <label htmlFor="contact-website">Website</label>
              <input
                id="contact-website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={armadilha}
                onChange={(e) => setArmadilha(e.target.value)}
              />
            </div>

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
                  onBlur={() => visitar('name')}
                  aria-invalid={Boolean(erro('name'))}
                  aria-describedby={erro('name') ? 'erro-name' : undefined}
                  className={`${inputClass} ${erro('name') ? 'border-red-400/50' : ''}`}
                  placeholder={t.contact.namePlaceholder}
                />
                {erro('name') && (
                  <p id="erro-name" className="text-xs text-red-300/80 mt-2">{erro('name')}</p>
                )}
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
                  onBlur={() => visitar('email')}
                  aria-invalid={Boolean(erro('email'))}
                  aria-describedby={erro('email') ? 'erro-email' : undefined}
                  className={`${inputClass} ${erro('email') ? 'border-red-400/50' : ''}`}
                  placeholder="email@exemplo.pt"
                />
                {erro('email') && (
                  <p id="erro-email" className="text-xs text-red-300/80 mt-2">{erro('email')}</p>
                )}
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
                  <span className="normal-case tracking-normal text-titanium/55">{t.contact.optional}</span>
                </label>
                <input
                  id="contact-date"
                  name="date"
                  type="date"
                  // Datas passadas não fazem sentido num pedido de orçamento.
                  min={new Date().toISOString().slice(0, 10)}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  onBlur={() => visitar('date')}
                  aria-invalid={Boolean(erro('date'))}
                  className={`${inputClass} [color-scheme:dark] ${erro('date') ? 'border-red-400/50' : ''}`}
                />
                {erro('date') && <p className="text-xs text-red-300/80 mt-2">{erro('date')}</p>}
              </div>
              <div>
                <label className="label-sm block mb-3" htmlFor="contact-location">
                  {t.contact.location_}{' '}
                  <span className="normal-case tracking-normal text-titanium/55">{t.contact.optional}</span>
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
                ref={areaRef}
                id="contact-message"
                name="message"
                required
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                onBlur={() => visitar('message')}
                aria-invalid={Boolean(erro('message'))}
                aria-describedby={erro('message') ? 'erro-message' : undefined}
                className="w-full bg-transparent border-b border-white/15 py-3 outline-none focus:border-titanium/60 transition-colors resize-none overflow-hidden text-base placeholder:text-titanium/55"
                placeholder={t.contact.messagePlaceholder}
              />
              {erro('message') && (
                <p id="erro-message" className="text-xs text-red-300/80 mt-2">{erro('message')}</p>
              )}
            </div>

            {/* O RGPD exige que se diga para que servem os dados no momento em
                que são pedidos, não só numa página escondida. */}
            <p className="text-xs text-titanium/55 leading-relaxed">
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

        </Reveal>
      </section>
    </div>
  )
}
