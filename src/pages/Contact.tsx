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
  /*
    Já não se exige ter havido escrita no formulário para o envio contar.

    Era a segunda regra deste género a deitar fora mensagens verdadeiras. A
    primeira descartava envios feitos em menos de três segundos e caía em cima
    de quem usa preenchimento automático. Esta caía em cima de quem volta à
    página com um rascunho guardado: o formulário aparece preenchido, a pessoa
    carrega em enviar sem escrever nada de novo, e a mensagem era descartada —
    com a página de agradecimento à frente, para ninguém dar por isso.

    Fica só a armadilha: um campo escondido que só um robô preenche. É sinal
    fiável, ao contrário de "não vi ninguém escrever", que é apenas a ausência
    de um sinal. Perder um pedido real custa muito mais do que deixar passar
    spam, que ainda leva com o filtro do serviço de formulários pela frente.
  */

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
    if (armadilha) {
      navigate(link('thanks'), { state: { via: 'form' } })
      return
    }

    if (!ENDPOINT) {
      // Abre o cliente de email já preenchido. Não há como confirmar o envio a
      // partir daqui, por isso o texto de sucesso reflete exatamente isso em
      // vez de afirmar que a mensagem chegou.
      limparRascunho()
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
      if (!res.ok) {
        /*
          O serviço recusou. A razão vem no corpo e é o que distingue um
          formulário por confirmar de um captcha exigido ou de uma quota
          esgotada — sem ela ficam todos com o mesmo "não deu", e não há por
          onde começar. Vai para a consola: a quem visita não interessa, e a
          quem mantém o site é a única pista.
        */
        const corpo: { errors?: { message?: string }[]; error?: string } | null = await res
          .json()
          .catch(() => null)
        const razao = corpo?.errors?.map((x) => x.message).filter(Boolean).join('; ') || corpo?.error || ''
        console.error(`Formulário recusado pelo serviço: HTTP ${res.status}${razao ? ` — ${razao}` : ''}`)
        throw new Error(`HTTP ${res.status}`)
      }
      /*
        O rascunho só se apaga depois de a mensagem estar entregue. Apagá-lo
        antes de enviar significa que uma falha de rede leva com ela o texto
        que a pessoa acabou de escrever — e é justamente quando ela mais
        precisa de o ter.
      */
      limparRascunho()
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

  return (
    <div className="pt-24 sm:pt-28 lg:pt-24 pb-16 sm:pb-20">
      <Seo
        title={t.contact.seoTitle}
        description={t.contact.seoDescription}
        jsonLd={breadcrumbJsonLd([
          { nome: t.nav.home, caminho: link('home') },
          { nome: t.nav.contact, caminho: link('contact') },
        ])}
      />

      <div className="container-px max-w-6xl mx-auto mb-6 lg:mb-2">
        <Breadcrumbs items={[{ label: t.nav.contact }]} />
      </div>

      {/*
        O título vive dentro da coluna da esquerda, e não num bloco a toda a
        largura por cima das duas. Num bloco por cima, a altura dele somava-se
        à do formulário e a página só acabava 1120px abaixo do topo, ou seja
        fora do ecrã em qualquer portátil. Ao lado, partilha a altura com o
        formulário em vez de a acrescentar, e a página inteira passa a caber
        num ecrã sem se rolar.

        A coluna da esquerda fica colada ao topo enquanto se percorre o
        formulário nos ecrãs onde ainda sobra alguma coisa por baixo.
      */}
      <section className="container-px max-w-6xl mx-auto grid lg:grid-cols-[1fr_1.25fr] gap-10 lg:gap-14 items-start">
        {/* Left: info */}
        <Reveal>
          {/*
            Sem caixas nem fundos: cada contacto é uma etiqueta pequena e o
            valor por baixo, como no desenho de referência. O peso visual da
            página passa todo para o painel do formulário, que é o que se quer
            que a pessoa use.
          */}
          <div className="space-y-7 lg:sticky lg:top-28">
            <div>
              <span className="label-sm">{t.contact.label}</span>
              {/*
                Menor do que nas outras páginas de propósito: aqui divide a
                linha com o formulário, e ao tamanho antigo empurrava a coluna
                da esquerda para lá da altura do painel.
              */}
              <h1 className="mt-3 leading-[1.05]" style={{ fontSize: 'clamp(2.2rem, 3.4vw, 3rem)' }}>
                {t.contact.title}
              </h1>
            </div>

            <p className="text-sm text-titanium/60 leading-relaxed max-w-sm">{t.contact.how}</p>

            <div className="space-y-6">
              <div>
                <p className="label-sm mb-3">Email</p>
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="inline-flex items-center gap-3 text-titanium/90 hover:text-titanium transition-colors break-all min-h-[44px]"
                >
                  <Mail size={16} className="shrink-0 text-titanium/50" />
                  {CONTACT.email}
                </a>
              </div>

              <div>
                <p className="label-sm mb-3">Instagram</p>
                <a
                  href={CONTACT.instagramDm}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => track('cta_instagram', { onde: 'contacto' })}
                  className="inline-flex items-center gap-3 text-titanium/90 hover:text-titanium transition-colors min-h-[44px]"
                >
                  <InstagramIcon size={16} className="shrink-0 text-titanium/50" />
                  {CONTACT.instagramHandle}
                </a>
              </div>

              <div>
                <p className="label-sm mb-3">{t.contact.locationLabel}</p>
                <p className="inline-flex items-center gap-3 text-titanium/90">
                  <MapPin size={16} className="shrink-0 text-titanium/50" />
                  {t.contact.location}
                </p>
              </div>
            </div>

            <p className="text-xs text-titanium/50 border-t border-white/10 pt-6">{t.contact.replyTime}</p>
          </div>
        </Reveal>

        {/* Right: form */}
        <Reveal delay={0.15}>
          {/*
            O formulário vive num painel ligeiramente mais claro que a página,
            com sombra por baixo. É o que faz a página ler-se como "a informação
            está ali, a acção está aqui" em vez de duas colunas de texto lado a
            lado. Só a partir de `sm`: num telemóvel um painel com margens por
            dentro rouba a largura toda aos campos.
          */}
          <form
            onSubmit={handleSubmit}
            noValidate
            aria-labelledby="titulo-formulario"
            className="space-y-5 sm:bg-white/[0.035] sm:border sm:border-white/10 sm:rounded-2xl sm:p-7 xl:p-8 sm:shadow-[0_28px_70px_-30px_rgba(0,0,0,0.85)]"
          >
            <h2
              id="titulo-formulario"
              className="text-[0.7rem] uppercase tracking-[0.3em] text-titanium/70 pb-4 border-b border-white/10"
            >
              {t.contact.formTitle}
            </h2>

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

            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
              <div className="relative">
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
                  className="campo"
                  placeholder=" "
                />
                <label className="campo-label" htmlFor="contact-name">{t.contact.name}</label>
                {erro('name') && (
                  <p id="erro-name" className="text-xs text-red-300/80 mt-2">{erro('name')}</p>
                )}
              </div>
              <div className="relative">
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
                  className="campo"
                  placeholder=" "
                />
                <label className="campo-label" htmlFor="contact-email">{t.contact.email}</label>
                {erro('email') && (
                  <p id="erro-email" className="text-xs text-red-300/80 mt-2">{erro('email')}</p>
                )}
              </div>
            </div>

            {/*
              A lista mostra sempre o primeiro serviço, por isso nunca está
              visualmente vazia: a etiqueta nasce já em cima, com `flutua`.
            */}
            <div className="relative">
              <select
                id="contact-service"
                name="service"
                value={form.service || servicos[0]}
                onChange={(e) => setForm({ ...form, service: e.target.value })}
                className="campo text-titanium/90"
              >
                {servicos.map((s) => (
                  <option key={s} className="bg-eerie">{s}</option>
                ))}
              </select>
              <label className="campo-label flutua" htmlFor="contact-service">{t.contact.service}</label>
            </div>

            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
              <div className="relative">
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
                  className="campo [color-scheme:dark] text-titanium/90"
                />
                {/* O campo de data desenha sempre o seu próprio dd/mm/aaaa, por
                    isso a etiqueta também tem de nascer em cima. */}
                <label className="campo-label flutua" htmlFor="contact-date">
                  {t.contact.date}{' '}
                  <span className="normal-case tracking-normal">{t.contact.optional}</span>
                </label>
                {erro('date') && <p className="text-xs text-red-300/80 mt-2">{erro('date')}</p>}
              </div>
              <div className="relative">
                <input
                  id="contact-location"
                  name="location"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="campo"
                  placeholder=" "
                />
                <label className="campo-label" htmlFor="contact-location">
                  {t.contact.location_}{' '}
                  <span className="normal-case tracking-normal">{t.contact.optional}</span>
                </label>
              </div>
            </div>

            <div className="relative">
              <textarea
                ref={areaRef}
                id="contact-message"
                name="message"
                required
                rows={3}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                onBlur={() => visitar('message')}
                aria-invalid={Boolean(erro('message'))}
                aria-describedby={`${erro('message') ? 'erro-message ' : ''}dica-message`}
                className="campo resize-none overflow-hidden"
                placeholder=" "
              />
              <label className="campo-label" htmlFor="contact-message">{t.contact.message}</label>
              {/*
                A sugestão do que escrever era o placeholder do campo. Com a
                etiqueta flutuante deixa de haver placeholder onde a pôr, e
                perdê-la custava caro: é ela que faz chegarem pedidos com data,
                local e ideia em vez de "olá, quanto custa?". Fica por baixo,
                onde se lê antes de começar a escrever e continua visível
                depois.
              */}
              <p id="dica-message" className="text-xs text-titanium/50 mt-2 leading-relaxed">
                {t.contact.messagePlaceholder}
              </p>
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
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-titanium text-eerie px-9 py-5 lg:py-4 rounded-full text-[11px] uppercase tracking-[0.2em] font-semibold group active:scale-95 hover:gap-5 transition-all min-h-[50px] disabled:opacity-60 disabled:cursor-wait"
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
