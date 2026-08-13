import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import Seo from '../lib/Seo'
import Reveal from '../lib/Reveal'
import { api } from '../lib/gallery/api'
import { CONFIGURED, DEMO } from '../lib/gallery/config'
import { loadSession, saveSession } from '../lib/gallery/session'
import { CONTACT } from '../lib/site'

export default function GalleryAccess() {
  const { slug: slugParam } = useParams()
  const navigate = useNavigate()
  const [slug, setSlug] = useState(slugParam ?? '')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'checking' | 'error' | 'server'>('idle')

  // Se o acesso ainda estiver válido nesta sessão, entra direto.
  useEffect(() => {
    if (slugParam && loadSession(slugParam)) navigate(`/galeria/${slugParam}/ver`, { replace: true })
  }, [slugParam, navigate])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const code = slug.trim().toLowerCase()
    if (!code || !password) return
    setStatus('checking')
    try {
      const access = await api.access(code, password)
      saveSession(code, access)
      navigate(`/galeria/${code}/ver`)
    } catch (err) {
      setStatus((err as Error).message === 'invalid_credentials' ? 'error' : 'server')
    }
  }

  const inputClass =
    'w-full bg-transparent border-b border-white/15 py-3 text-base outline-none focus:border-titanium/60 transition-colors placeholder:text-titanium/25'

  return (
    <div className="pt-28 sm:pt-36 pb-20 sm:pb-28 min-h-screen">
      <Seo
        title="Galeria privada — NEBULA"
        description="Acesso à galeria privada de clientes NEBULA."
      />

      <section className="container-px max-w-md mx-auto">
        <Reveal>
          <div className="w-12 h-12 rounded-full border border-white/15 flex items-center justify-center mb-8">
            <Lock size={18} className="text-titanium/60" />
          </div>
          <span className="label-sm">Área de clientes</span>
          <h1 className="mt-4 leading-[1.05]" style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)' }}>
            A vossa galeria privada.
          </h1>
          <p className="text-sm text-titanium/50 leading-relaxed mt-5">
            Introduzam o código e a password que vos enviámos. Se não os
            tiverem à mão, é só dizer.
          </p>
        </Reveal>

        {DEMO && (
          <div className="mt-8 border border-amber-400/30 bg-amber-400/[0.07] rounded-xl p-4 text-xs leading-relaxed text-amber-100/80">
            <strong className="block mb-1">Modo de demonstração</strong>
            Os dados são falsos e nada aqui está protegido a sério. Experimenta
            com o código <code className="text-amber-100">ana-e-tiago</code> e a
            password <code className="text-amber-100">demo</code>.
          </div>
        )}

        {!DEMO && !CONFIGURED && (
          <div className="mt-8 border border-red-400/30 bg-red-400/[0.07] rounded-xl p-4 text-xs leading-relaxed text-red-100/80">
            <strong className="block mb-1">Galerias por configurar</strong>
            Faltam as variáveis do Supabase neste deploy, por isso o acesso está
            indisponível. Ver o README.
          </div>
        )}

        <Reveal delay={0.12}>
          <form onSubmit={submit} className="mt-10 space-y-7">
            <div>
              <label className="label-sm block mb-3" htmlFor="gallery-slug">
                Código da galeria
              </label>
              <input
                id="gallery-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                readOnly={Boolean(slugParam)}
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className={`${inputClass} ${slugParam ? 'text-titanium/50' : ''}`}
                placeholder="ex. ana-e-tiago"
              />
            </div>
            <div>
              <label className="label-sm block mb-3" htmlFor="gallery-password">
                Password
              </label>
              <input
                id="gallery-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className={inputClass}
                placeholder="••••••••"
              />
            </div>

            {status === 'error' && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                role="alert"
                className="text-sm text-titanium/75 border border-white/15 rounded-xl p-4"
              >
                Código ou password incorretos. Ao fim de várias tentativas
                falhadas o acesso fica temporariamente bloqueado — se precisarem,{' '}
                <a href={`mailto:${CONTACT.email}`} className="underline break-all">
                  escrevam-nos
                </a>
                .
              </motion.p>
            )}
            {status === 'server' && (
              <p role="alert" className="text-sm text-titanium/75 border border-white/15 rounded-xl p-4">
                Não conseguimos verificar o acesso neste momento. Tentem daqui a
                pouco ou{' '}
                <a href={`mailto:${CONTACT.email}`} className="underline break-all">
                  falem connosco
                </a>
                .
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'checking'}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-titanium text-eerie px-9 py-5 rounded-full text-[11px] uppercase tracking-[0.2em] font-semibold active:scale-95 transition-all min-h-[50px] disabled:opacity-60 disabled:cursor-wait"
            >
              {status === 'checking' ? 'A verificar…' : 'Entrar'}
            </button>
          </form>
        </Reveal>
      </section>
    </div>
  )
}
