import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { api } from '../../lib/gallery/api'
import { CONFIGURED, DEMO } from '../../lib/gallery/config'

/**
 * Porta de entrada do painel. Não há link para aqui em lado nenhum do site — o
 * URL é o segredo de conveniência, mas quem protege é o login: sem sessão
 * autenticada, as políticas RLS do Supabase recusam tudo.
 */
export default function AdminShell({ children }: { children: ReactNode }) {
  // Em demonstração o login é ruído: são dados falsos e a "autenticação" aceita
  // tudo, por isso entra-se direto para ver o painel. Fora da demonstração, sem
  // backend configurado não há sessão possível — arranca em 'out' em vez de
  // passar por 'loading' e chamar setState dentro do efeito.
  const [state, setState] = useState<'loading' | 'out' | 'in'>(
    DEMO ? 'in' : CONFIGURED ? 'loading' : 'out',
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // O painel nunca deve ser indexado, mesmo que alguém descubra o URL.
    // Sobrepõe-se à meta que já vem no index.html em vez de acrescentar uma
    // segunda: duas metas `robots` contraditórias na mesma página são um convite
    // a que cada crawler decida por si.
    const existing = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')
    const previous = existing?.content
    const meta = existing ?? document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    if (!existing) document.head.appendChild(meta)

    return () => {
      if (existing && previous !== undefined) existing.content = previous
      else meta.remove()
    }
  }, [])

  useEffect(() => {
    // Em demonstração já entrámos: perguntar pela sessão só serviria para nos
    // pôr fora outra vez.
    if (DEMO || !CONFIGURED) return
    api.currentUser().then((u) => setState(u ? 'in' : 'out')).catch(() => setState('out'))
  }, [])

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.signIn(email, password)
      if (DEMO) sessionStorage.setItem('nebula-demo-admin', '1')
      setState('in')
    } catch (err) {
      setError((err as Error).message || 'Não foi possível entrar.')
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    await api.signOut()
    sessionStorage.removeItem('nebula-demo-admin')
    setState('out')
    navigate('/admin')
  }

  if (state === 'loading') return <div className="min-h-screen" />

  if (state === 'out') {
    return (
      <div className="min-h-screen flex items-center justify-center container-px py-24">
        <div className="w-full max-w-sm">
          <span className="label-sm">NEBULA</span>
          <h1 className="mt-3 text-3xl">Painel</h1>

          {DEMO && (
            <div className="mt-6 border border-amber-400/30 bg-amber-400/[0.07] rounded-xl p-4 text-xs text-amber-100/80 leading-relaxed">
              <strong className="block mb-1">Modo de demonstração</strong>
              Normalmente entra-se direto, sem este ecrã. Se chegaste aqui foi
              por teres saído — qualquer email serve e a password só precisa de
              3 caracteres.
            </div>
          )}
          {!DEMO && !CONFIGURED && (
            <div className="mt-6 border border-red-400/30 bg-red-400/[0.07] rounded-xl p-4 text-xs text-red-100/80 leading-relaxed">
              <strong className="block mb-1">Supabase por configurar</strong>
              Faltam VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY neste build. Ver
              a secção "Galerias privadas" do README.
            </div>
          )}

          <form onSubmit={signIn} className="mt-8 space-y-6">
            <div>
              <label className="label-sm block mb-3" htmlFor="admin-email">Email</label>
              <input
                id="admin-email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-b border-white/15 py-3 outline-none focus:border-titanium/60 transition-colors"
              />
            </div>
            <div>
              <label className="label-sm block mb-3" htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-b border-white/15 py-3 outline-none focus:border-titanium/60 transition-colors"
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-titanium/75 border border-white/15 rounded-xl p-3">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy || (!CONFIGURED && !DEMO)}
              className="w-full bg-titanium text-eerie py-4 rounded-full text-[11px] uppercase tracking-[0.2em] font-semibold active:scale-95 transition-all disabled:opacity-50"
            >
              {busy ? 'A entrar…' : 'Entrar'}
            </button>
          </form>

          <Link to="/" className="label-sm inline-block mt-10 hover:text-titanium/70 transition-colors">
            ← Voltar ao site
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-8 pb-24">
      <header className="container-px flex items-center justify-between mb-12 flex-wrap gap-4">
        <Link to="/admin" className="flex items-baseline gap-3">
          <span className="text-lg font-semibold tracking-tight">NEBULA</span>
          <span className="label-sm">Painel</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="text-[11px] uppercase tracking-[0.18em] text-titanium/40 hover:text-titanium/70 transition-colors px-3 py-2"
          >
            Ver site
          </Link>
          <button
            onClick={signOut}
            className="text-[11px] uppercase tracking-[0.18em] text-titanium/40 hover:text-titanium/70 transition-colors px-3 py-2"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Separadores: as galerias de cliente e o site são trabalhos diferentes. */}
      <nav className="container-px mb-10 flex gap-1 border-b border-white/[0.08]">
        {[
          { to: '/admin', label: 'Galerias', end: true },
          { to: '/admin/site', label: 'Site', end: false },
        ].map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `px-5 py-3 text-[11px] uppercase tracking-[0.18em] border-b-2 -mb-px transition-colors ${
                isActive
                  ? 'border-titanium text-titanium'
                  : 'border-transparent text-titanium/40 hover:text-titanium/70'
              }`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      {DEMO && (
        <div className="container-px mb-8">
          <div className="border border-amber-400/30 bg-amber-400/[0.07] rounded-xl p-3 text-xs text-amber-100/80">
            Modo de demonstração — entrada sem password, dados falsos e nada é
            guardado. No site publicado o painel exige sempre login.
          </div>
        </div>
      )}
      {children}
    </div>
  )
}
