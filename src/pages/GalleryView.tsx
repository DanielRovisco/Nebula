import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Download, Package, Play, X } from 'lucide-react'
import Seo from '../lib/Seo'
import { loadSession, clearSession } from '../lib/gallery/session'
import { downloadAll, downloadOne, ZIP_WARN_BYTES, type ZipProgress } from '../lib/gallery/download'
import { DEMO } from '../lib/gallery/config'
import { api } from '../lib/gallery/api'
import { isVideo, type GalleryAccess } from '../lib/gallery/types'
import GalleryIntro from './gallery/GalleryIntro'
import GalleryCover from './gallery/GalleryCover'

/** A introdução aparece uma vez por sessão e por galeria. */
const introKey = (slug: string) => `nebula-intro-${slug}`

export default function GalleryView() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  // Estado inicial derivado da sessão guardada: evita um render vazio seguido
  // de setState dentro do efeito.
  const [access] = useState<GalleryAccess | null>(() => loadSession(slug))
  const [showIntro, setShowIntro] = useState(() => {
    try {
      return !sessionStorage.getItem(introKey(slug))
    } catch {
      return true
    }
  })
  const [open, setOpen] = useState<number | null>(null)
  const [zipping, setZipping] = useState<ZipProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Sem sessão válida (nunca entrou, ou os URLs assinados expiraram) volta
    // ao pedido de password.
    if (!access) navigate(`/galeria/${slug}`, { replace: true })
  }, [access, slug, navigate])

  const photos = useMemo(() => access?.photos ?? [], [access])
  const totalBytes = useMemo(
    () => photos.reduce((sum, p) => sum + (p.sizeBytes ?? 0), 0),
    [photos],
  )

  const endIntro = useCallback(() => {
    try {
      sessionStorage.setItem(introKey(slug), '1')
    } catch { /* sem sessionStorage a introdução repete-se; não é grave */ }
    setShowIntro(false)
  }, [slug])

  const close = useCallback(() => setOpen(null), [])
  const step = useCallback(
    (delta: number) => setOpen((i) => (i === null ? null : (i + delta + photos.length) % photos.length)),
    [photos.length],
  )

  // Navegação por teclado no lightbox.
  useEffect(() => {
    if (open === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, close, step])

  async function handleDownloadAll() {
    if (!access) return
    if (totalBytes > ZIP_WARN_BYTES) {
      const go = window.confirm(
        'Esta galeria é grande e o ZIP é montado na memória do dispositivo, ' +
          'o que pode falhar em telemóveis. Preferem descarregar assim mesmo?',
      )
      if (!go) return
    }
    setError(null)
    abortRef.current = new AbortController()
    try {
      await downloadAll(photos, access.gallery.title, setZipping, abortRef.current.signal)
      if (access.logToken) api.logEvent(access.logToken, { kind: 'download_all' })
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError('O download falhou a meio. Os links podem ter expirado — voltem a entrar.')
      }
    } finally {
      setZipping(null)
      abortRef.current = null
    }
  }

  async function handleDownloadOne(index: number) {
    setError(null)
    try {
      await downloadOne(photos[index])
      if (access?.logToken) {
        api.logEvent(access.logToken, {
          kind: 'download_one',
          photoId: photos[index].id,
          fileName: photos[index].fileName,
        })
      }
    } catch {
      setError('Não foi possível descarregar esse ficheiro. Voltem a entrar e tentem de novo.')
    }
  }

  if (!access) return <div className="min-h-screen" />

  const { gallery } = access
  const current = open !== null ? photos[open] : null

  return (
    <div className="min-h-screen">
      <Seo title={`${gallery.title} — NEBULA`} description="Galeria privada de cliente." />

      <AnimatePresence>
        {showIntro && (
          <GalleryIntro
            key="intro"
            clientName={gallery.clientName}
            title={gallery.coverTitle?.trim() || gallery.title}
            onDone={endIntro}
          />
        )}
      </AnimatePresence>

      {/* ── Capa ─────────────────────────────────────────── */}
      <GalleryCover
        gallery={gallery}
        onEnter={() => gridRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })}
      />

      <div ref={gridRef} className="pt-16 sm:pt-24 pb-20 sm:pb-28">
        {DEMO && (
          <div className="container-px mb-8">
            <div className="border border-amber-400/30 bg-amber-400/[0.07] rounded-xl p-3 text-xs text-amber-100/80">
              Modo de demonstração — dados falsos, sem proteção real.
            </div>
          </div>
        )}

        <section className="container-px mb-10 sm:mb-14">
          {gallery.message && (
            <p className="text-sm text-titanium/55 leading-relaxed max-w-lg mb-8">
              {gallery.message}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <span className="label-sm">
              {photos.length} {photos.length === 1 ? 'ficheiro' : 'ficheiros'}
            </span>
            {gallery.downloadEnabled && photos.length > 0 && (
              <button
                onClick={handleDownloadAll}
                disabled={Boolean(zipping)}
                className="inline-flex items-center gap-2.5 bg-titanium text-eerie px-6 py-3 rounded-full text-[11px] uppercase tracking-[0.18em] font-semibold active:scale-95 transition-all min-h-[44px] disabled:opacity-60 disabled:cursor-wait"
              >
                <Package size={14} />
                {zipping ? `${zipping.phase} ${zipping.done}/${zipping.total}` : 'Descarregar tudo'}
              </button>
            )}
            {zipping && (
              <button
                onClick={() => abortRef.current?.abort()}
                className="text-[11px] uppercase tracking-[0.18em] text-titanium/50 underline px-3 py-2"
              >
                Cancelar
              </button>
            )}
            <button
              onClick={() => {
                clearSession(slug)
                navigate(`/galeria/${slug}`)
              }}
              className="text-[11px] uppercase tracking-[0.18em] text-titanium/40 hover:text-titanium/70 transition-colors px-3 py-2 ml-auto"
            >
              Sair
            </button>
          </div>

          {zipping && (
            <div className="mt-4 h-px bg-white/10 max-w-md overflow-hidden">
              <div
                className="h-full bg-titanium transition-[width] duration-300"
                style={{ width: `${Math.round((zipping.done / Math.max(zipping.total, 1)) * 100)}%` }}
              />
            </div>
          )}

          {error && (
            <p role="alert" className="mt-5 text-sm text-titanium/75 border border-white/15 rounded-xl p-4 max-w-lg">
              {error}
            </p>
          )}
        </section>

        {/* ── Grelha ───────────────────────────────────────── */}
        <section className="container-px">
          {photos.length === 0 ? (
            <p className="text-sm text-titanium/45">
              Ainda não há ficheiros nesta galeria. Avisamos assim que estiverem prontos.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              {photos.map((photo, i) => (
                <motion.div
                  key={photo.id}
                  initial={reduced ? false : { opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5 }}
                  className="relative overflow-hidden rounded-lg group aspect-[3/4] bg-white/[0.04]"
                >
                  <button
                    onClick={() => setOpen(i)}
                    className="absolute inset-0 w-full h-full"
                    aria-label={`Abrir ${photo.fileName}`}
                  >
                    <img
                      src={photo.thumbUrl ?? photo.url ?? ''}
                      alt={photo.fileName}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <span className="absolute inset-0 bg-eerie/0 group-hover:bg-eerie/25 transition-colors" />
                    {isVideo(photo) && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="w-11 h-11 rounded-full bg-eerie/60 backdrop-blur-sm flex items-center justify-center">
                          <Play size={16} className="text-titanium ml-0.5" fill="currentColor" />
                        </span>
                      </span>
                    )}
                  </button>

                  {/*
                    Download por ficheiro sem ter de abrir o visualizador. Ao
                    toque fica sempre visível, porque não há hover no telemóvel.
                  */}
                  {gallery.downloadEnabled && (
                    <button
                      onClick={() => handleDownloadOne(i)}
                      aria-label={`Descarregar ${photo.fileName}`}
                      className="absolute bottom-1.5 right-1.5 p-2.5 rounded-full bg-eerie/70 text-titanium/85 hover:text-titanium hover:bg-eerie/90 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                    >
                      <Download size={15} />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </section>

        <div className="container-px mt-16">
          <Link to="/" className="label-sm hover:text-titanium/70 transition-colors">
            ← Voltar ao site
          </Link>
        </div>
      </div>

      {/* ── Visualizador ─────────────────────────────────── */}
      <AnimatePresence>
        {current && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            // Opaco, não 97%: com transparência via-se o site inteiro por trás
            // da fotografia. Numa galeria a foto tem de ser a única coisa no ecrã.
            className="fixed inset-0 z-[120] bg-eerie flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label={current.fileName}
          >
            <div className="flex items-center justify-between container-px py-5 shrink-0">
              <span className="label-sm">
                {(open ?? 0) + 1} / {photos.length}
              </span>
              <div className="flex items-center gap-1">
                {gallery.downloadEnabled && (
                  <button
                    onClick={() => handleDownloadOne(open!)}
                    className="p-3 text-titanium/60 hover:text-titanium transition-colors"
                    aria-label="Descarregar este ficheiro"
                  >
                    <Download size={20} />
                  </button>
                )}
                <button
                  onClick={close}
                  className="p-3 text-titanium/60 hover:text-titanium transition-colors"
                  aria-label="Fechar"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 flex items-center justify-center px-2 sm:px-16 pb-6">
              {isVideo(current) ? (
                <video
                  key={current.id}
                  src={current.url ?? ''}
                  controls
                  autoPlay
                  playsInline
                  className="max-w-full max-h-full"
                />
              ) : (
                <img
                  key={current.id}
                  src={current.url ?? ''}
                  alt={current.fileName}
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </div>

            {photos.length > 1 && (
              <>
                <button
                  onClick={() => step(-1)}
                  aria-label="Anterior"
                  className="absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 p-4 text-titanium/50 hover:text-titanium transition-colors"
                >
                  <ChevronLeft size={30} />
                </button>
                <button
                  onClick={() => step(1)}
                  aria-label="Seguinte"
                  className="absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 p-4 text-titanium/50 hover:text-titanium transition-colors"
                >
                  <ChevronRight size={30} />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
