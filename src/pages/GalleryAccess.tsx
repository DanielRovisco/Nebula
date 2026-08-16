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
import { useLang, useT } from '../lib/i18n'
import { GALLERY_VIEW, ROUTES } from '../lib/i18n/routes'

export default function GalleryAccess() {
  const t = useT()
  const lang = useLang()
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
      navigate(`${ROUTES.gallery[lang]}/${code}/${GALLERY_VIEW[lang]}`)
    } catch (err) {
      setStatus((err as Error).message === 'invalid_credentials' ? 'error' : 'server')
    }
  }

  const inputClass =
    'w-full bg-transparent border-b border-white/15 py-3 text-base outline-none focus:border-titanium/60 transition-colors placeholder:text-titanium/25'

  return (
    <div className="pt-28 sm:pt-36 pb-20 sm:pb-28 min-h-screen">
      <Seo
        title={t.galleryAccess.seoTitle}
        description={t.galleryAccess.seoDescription}
      />

      <section className="container-px max-w-md mx-auto">
        <Reveal>
          <div className="w-12 h-12 rounded-full border border-white/15 flex items-center justify-center mb-8">
            <Lock size={18} className="text-titanium/60" />
          </div>
          <span className="label-sm">{t.galleryAccess.label}</span>
          <h1 className="mt-4 leading-[1.05]" style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)' }}>
            {t.galleryAccess.title}
          </h1>
          <p className="text-sm text-titanium/50 leading-relaxed mt-5">
            {t.galleryAccess.intro}
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
            <strong className="block mb-1">{t.galleryAccess.notConfiguredTitle}</strong>
            {t.galleryAccess.notConfigured}
          </div>
        )}

        <Reveal delay={0.12}>
          <form onSubmit={submit} className="mt-10 space-y-7">
            <div>
              <label className="label-sm block mb-3" htmlFor="gallery-slug">
                {t.galleryAccess.code}
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
                placeholder={t.galleryAccess.codePlaceholder}
              />
            </div>
            <div>
              <label className="label-sm block mb-3" htmlFor="gallery-password">
                {t.galleryAccess.password}
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
                {t.galleryAccess.wrong}{' '}
                <a href={`mailto:${CONTACT.email}`} className="underline break-all">
                  {t.galleryAccess.writeToUs}
                </a>
                .
              </motion.p>
            )}
            {status === 'server' && (
              <p role="alert" className="text-sm text-titanium/75 border border-white/15 rounded-xl p-4">
                {t.galleryAccess.serverError}{' '}
                <a href={`mailto:${CONTACT.email}`} className="underline break-all">
                  {t.galleryAccess.talkToUs}
                </a>
                .
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'checking'}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-titanium text-eerie px-9 py-5 rounded-full text-[11px] uppercase tracking-[0.2em] font-semibold active:scale-95 transition-all min-h-[50px] disabled:opacity-60 disabled:cursor-wait"
            >
              {status === 'checking' ? t.galleryAccess.checking : t.galleryAccess.enter}
            </button>
          </form>
        </Reveal>
      </section>
    </div>
  )
}
