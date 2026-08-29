import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Download, Heart, Package, Pause, Play, X } from 'lucide-react'
import Seo from '../lib/Seo'
import { linhasJustificadas } from '../lib/linhasJustificadas'
import { loadSession, clearSession } from '../lib/gallery/session'
import { ROUTES } from '../lib/i18n/routes'
import { downloadAll, downloadOne, ZIP_WARN_BYTES, type ZipProgress } from '../lib/gallery/download'
import { DEMO } from '../lib/gallery/config'
import { api } from '../lib/gallery/api'
import { isVideo, type GalleryAccess } from '../lib/gallery/types'
import GalleryIntro from './gallery/GalleryIntro'
import { useLang, useT } from '../lib/i18n'
import type { Dict } from '../lib/i18n'
import GalleryCover from './gallery/GalleryCover'

/** A introdução aparece uma vez por sessão e por galeria. */
const introKey = (slug: string) => `nebula-intro-${slug}`

const DIA = 864e5

/**
 * Aviso de que a galeria tem prazo.
 *
 * Uma galeria que fecha sem avisar é um cliente que perde as fotografias do
 * casamento. A partir de 30 dias é só uma informação discreta; a menos de 14
 * passa a destacado, que é quando ainda dá para fazer alguma coisa.
 */
function avisoDeValidade(expiresAt: string | null | undefined, t: Dict, locale: string) {
  if (!expiresAt) return null
  const fim = new Date(expiresAt)
  if (Number.isNaN(fim.getTime())) return null

  const dias = Math.ceil((fim.getTime() - Date.now()) / DIA)
  if (dias <= 0) return null

  const data = fim.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
  if (dias > 30) return { urgente: false, texto: t.gallery.availableUntil(data) }
  return {
    urgente: true,
    texto: dias === 1 ? t.gallery.lastDay(data) : t.gallery.closingIn(dias, data),
  }
}

export default function GalleryView() {
  const t = useT()
  const lang = useLang()
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const reduced = useReducedMotion()

  /*
    A largura é medida, não adivinhada: as linhas justificadas precisam de
    saber com quantos pixels contam, e isso muda com o ecrã, com a barra de
    deslocamento e com a rotação do telemóvel.
  */
  const grelhaRef = useRef<HTMLDivElement>(null)
  const [larguraGrelha, setLarguraGrelha] = useState(0)
  useEffect(() => {
    const el = grelhaRef.current
    if (!el) return
    const obs = new ResizeObserver(() => setLarguraGrelha(el.clientWidth))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

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
  // Fotografias marcadas pelo cliente. Arranca com o que veio da sessão para os
  // corações não aparecerem vazios a cada visita.
  const [favoritas, setFavoritas] = useState<Set<string>>(
    () => new Set(loadSession(slug)?.favorites ?? []),
  )
  /*
    Descarrega-se sempre o original.

    Houve aqui um seletor entre original e uma versão reduzida para web. Saiu:
    obrigava quem recebe as fotografias a decidir uma coisa técnica antes de
    poder carregar no botão, e a resposta certa era quase sempre a mesma. Quem
    quiser uma versão pequena redimensiona-a onde já a vai usar.
  */
  const [zipping, setZipping] = useState<ZipProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Sem sessão válida (nunca entrou, ou os URLs assinados expiraram) volta
    // ao pedido de password.
    if (!access) navigate(`${ROUTES.gallery[lang]}/${slug}`, { replace: true })
  }, [access, slug, lang, navigate])

  const photos = useMemo(() => access?.photos ?? [], [access])
  /*
    Alturas diferentes por ecrã: no telemóvel, linhas de 300px dariam uma
    fotografia por linha e uma galeria de 200 com dois metros de altura.
  */
  const alturaAlvo = larguraGrelha < 480 ? 170 : larguraGrelha < 900 ? 230 : 300
  const goteira = larguraGrelha < 640 ? 8 : 12
  const linhas = useMemo(
    () => linhasJustificadas(photos, larguraGrelha, alturaAlvo, goteira),
    [photos, larguraGrelha, alturaAlvo, goteira],
  )
  // O índice original importa: é o que o lightbox usa para saber onde está.
  const indicePorId = useMemo(
    () => new Map(photos.map((f, i) => [f.id, i])),
    [photos],
  )
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

  // Apresentação: avança sozinha de 4 em 4 segundos enquanto o visualizador
  // estiver aberto. Para em qualquer vídeo — deixar um filme a ser interrompido
  // a meio por um temporizador não é uma apresentação, é uma avaria.
  const [slideshow, setSlideshow] = useState(false)

  const close = useCallback(() => {
    setSlideshow(false)
    setOpen(null)
  }, [])
  const step = useCallback(
    (delta: number) => setOpen((i) => (i === null ? null : (i + delta + photos.length) % photos.length)),
    [photos.length],
  )

  useEffect(() => {
    if (!slideshow || open === null) return
    const atual = photos[open]
    if (atual && isVideo(atual)) return
    const t = setTimeout(() => step(1), 4000)
    return () => clearTimeout(t)
  }, [slideshow, open, photos, step])

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

  /**
   * Marca ou desmarca uma fotografia. O coração muda já, antes da resposta —
   * esperar pela rede a cada toque tornava a escolha de 30 fotografias num
   * exercício de paciência. Se o pedido falhar, volta atrás e diz porquê.
   */
  async function alternarFavorita(photoId: string) {
    if (!access?.logToken) return
    const marcar = !favoritas.has(photoId)
    setFavoritas((atual) => {
      const proximo = new Set(atual)
      if (marcar) proximo.add(photoId)
      else proximo.delete(photoId)
      return proximo
    })
    try {
      await api.setFavorite(access.logToken, photoId, marcar)
    } catch {
      setFavoritas((atual) => {
        const proximo = new Set(atual)
        if (marcar) proximo.delete(photoId)
        else proximo.add(photoId)
        return proximo
      })
      setError(t.gallery.favoriteFailed)
    }
  }

  /**
   * ZIP só com as fotografias marcadas.
   *
   * Partilha o caminho do download completo — o que muda é a lista e o nome do
   * ficheiro. Sem o sufixo, o cliente ficava com dois ZIP com o mesmo nome na
   * pasta das transferências e sem saber qual era qual.
   */
  async function handleDownloadFavorites() {
    if (!access) return
    const escolhidas = photos.filter((p) => favoritas.has(p.id))
    if (escolhidas.length === 0) return
    setError(null)
    abortRef.current = new AbortController()
    try {
      await downloadAll(
        escolhidas,
        access.gallery.title,
        setZipping,
        abortRef.current.signal,
        t.gallery.chosenSuffix,
        false,
      )
      if (access.logToken) api.logEvent(access.logToken, { kind: 'download_favorites' })
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setError(t.gallery.downloadFailed)
    } finally {
      setZipping(null)
      abortRef.current = null
    }
  }

  async function handleDownloadAll() {
    if (!access) return
    if (totalBytes > ZIP_WARN_BYTES) {
      const go = window.confirm(t.gallery.zipWarning)
      if (!go) return
    }
    setError(null)
    abortRef.current = new AbortController()
    try {
      await downloadAll(
        photos,
        access.gallery.title,
        setZipping,
        abortRef.current.signal,
        undefined,
        false,
      )
      if (access.logToken) api.logEvent(access.logToken, { kind: 'download_all' })
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(t.gallery.downloadFailed)
      }
    } finally {
      setZipping(null)
      abortRef.current = null
    }
  }

  async function handleDownloadOne(index: number) {
    setError(null)
    try {
      await downloadOne(photos[index], false)
      if (access?.logToken) {
        api.logEvent(access.logToken, {
          kind: 'download_one',
          photoId: photos[index].id,
          fileName: photos[index].fileName,
        })
      }
    } catch {
      setError(t.gallery.downloadOneFailed)
    }
  }

  if (!access) return <div className="min-h-screen" />

  const { gallery } = access
  const current = open !== null ? photos[open] : null
  const aviso = avisoDeValidade(gallery.expiresAt, t, lang === 'pt' ? 'pt-PT' : 'en-GB')

  return (
    <div className="min-h-screen">
      <Seo title={`${gallery.title} | NEBULA`} description={t.gallery.seoDescription} noindex />

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

        {aviso && (
          <div className="container-px mb-8">
            <div
              className={`rounded-xl p-4 text-xs leading-relaxed border ${
                aviso.urgente
                  ? 'border-amber-400/30 bg-amber-400/[0.07] text-amber-100/85'
                  : 'border-white/10 text-titanium/60'
              }`}
            >
              {aviso.texto}
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
              {photos.length} {photos.length === 1 ? t.gallery.files : t.gallery.filesPlural}
            </span>
            {favoritas.size > 0 && (
              <span className="label-sm inline-flex items-center gap-1.5 text-titanium/60">
                <Heart size={11} fill="currentColor" />
                {favoritas.size} {favoritas.size === 1 ? t.gallery.chosen : t.gallery.chosenPlural}
              </span>
            )}
            {gallery.downloadEnabled && photos.length > 0 && (
              <button
                onClick={handleDownloadAll}
                disabled={Boolean(zipping)}
                className="inline-flex items-center gap-2.5 bg-titanium text-eerie px-6 py-3 rounded-full text-[11px] uppercase tracking-[0.18em] font-semibold active:scale-95 transition-all min-h-[44px] disabled:opacity-60 disabled:cursor-wait"
              >
                <Package size={14} />
                {zipping ? `${zipping.phase} ${zipping.done}/${zipping.total}` : t.gallery.downloadAll}
              </button>
            )}
            {/* Só aparece depois de haver escolhas — um botão a dizer
                "descarregar 0 escolhidas" não serve para nada. */}
            {gallery.downloadEnabled && favoritas.size > 0 && (
              <button
                onClick={handleDownloadFavorites}
                disabled={Boolean(zipping)}
                className="inline-flex items-center gap-2.5 border border-white/25 px-6 py-3 rounded-full text-[11px] uppercase tracking-[0.18em] text-titanium/85 hover:border-white/50 hover:text-titanium active:scale-95 transition-all min-h-[44px] disabled:opacity-60 disabled:cursor-wait"
              >
                <Heart size={14} fill="currentColor" />
                {t.gallery.downloadChosen} ({favoritas.size})
              </button>
            )}
            {zipping && (
              <button
                onClick={() => abortRef.current?.abort()}
                className="text-[11px] uppercase tracking-[0.18em] text-titanium/50 underline px-3 py-2"
              >
                {t.gallery.cancel}
              </button>
            )}
            <button
              onClick={() => {
                clearSession(slug)
                navigate(`${ROUTES.gallery[lang]}/${slug}`)
              }}
              className="text-[11px] uppercase tracking-[0.18em] text-titanium/55 hover:text-titanium/70 transition-colors px-3 py-2 ml-auto"
            >
              {t.gallery.exit}
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
            <p className="text-sm text-titanium/60">
              {t.gallery.empty}
            </p>
          ) : (
            <div ref={grelhaRef} className="flex flex-col gap-2 sm:gap-3">
              {/*
                Linhas justificadas em vez de uma grelha de quadrados. Cortar
                tudo a 3:4 dava uma parede regular, mas roubava metade de cada
                fotografia deitada e punha o enquadramento nas mãos do recorte
                automático. Aqui cada uma mantém a forma que lhe foi dada.
              */}
              {linhas.map((linha, li) => (
                <div key={li} className="flex gap-2 sm:gap-3">
                  {linha.map((medida) => {
                    const i = indicePorId.get(medida.id)!
                    const photo = photos[i]
                    return (
                <motion.div
                  key={photo.id}
                  initial={reduced ? false : { opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5 }}
                  style={{ width: medida.largura, height: medida.altura }}
                  className="relative overflow-hidden rounded-lg group bg-white/[0.04] shrink-0"
                >
                  <button
                    onClick={() => setOpen(i)}
                    className="absolute inset-0 w-full h-full"
                    aria-label={`${t.gallery.open} ${photo.fileName}`}
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
                      aria-label={`${t.gallery.download} ${photo.fileName}`}
                      className="absolute bottom-1.5 right-1.5 p-2.5 rounded-full bg-eerie/70 text-titanium/85 hover:text-titanium hover:bg-eerie/90 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                    >
                      <Download size={15} />
                    </button>
                  )}

                  {/*
                    Uma vez marcada, a fotografia mostra o coração sempre — a
                    escolha tem de se ver de relance, sem passar o rato por cima
                    de 200 fotografias para saber o que já foi escolhido.
                  */}
                  <button
                    onClick={() => alternarFavorita(photo.id)}
                    aria-pressed={favoritas.has(photo.id)}
                    aria-label={`${
                      favoritas.has(photo.id) ? t.gallery.unchoose : t.gallery.choose
                    }: ${photo.fileName}`}
                    className={`absolute bottom-1.5 left-1.5 p-2.5 rounded-full bg-eerie/70 hover:bg-eerie/90 transition-all active:scale-90 ${
                      favoritas.has(photo.id)
                        ? 'text-titanium'
                        : 'text-titanium/85 sm:opacity-0 sm:group-hover:opacity-100'
                    }`}
                  >
                    <Heart size={15} fill={favoritas.has(photo.id) ? 'currentColor' : 'none'} />
                  </button>
                </motion.div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="container-px mt-16">
          <Link to={ROUTES.home[lang]} className="label-sm hover:text-titanium/70 transition-colors">
            {t.common.backToSite}
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
                {photos.length > 1 && (
                  <button
                    onClick={() => setSlideshow((v) => !v)}
                    aria-pressed={slideshow}
                    aria-label={slideshow ? t.gallery.stopSlideshow : t.gallery.slideshow}
                    className={`p-3 transition-colors ${slideshow ? 'text-titanium' : 'text-titanium/60 hover:text-titanium'}`}
                  >
                    {slideshow ? <Pause size={20} /> : <Play size={20} />}
                  </button>
                )}
                <button
                  onClick={() => alternarFavorita(current.id)}
                  aria-pressed={favoritas.has(current.id)}
                  className={`p-3 transition-colors ${
                    favoritas.has(current.id) ? 'text-titanium' : 'text-titanium/60 hover:text-titanium'
                  }`}
                  aria-label={favoritas.has(current.id) ? t.gallery.unchoose : t.gallery.choose}
                >
                  <Heart size={20} fill={favoritas.has(current.id) ? 'currentColor' : 'none'} />
                </button>
                {gallery.downloadEnabled && (
                  <button
                    onClick={() => handleDownloadOne(open!)}
                    className="p-3 text-titanium/60 hover:text-titanium transition-colors"
                    aria-label={t.gallery.download}
                  >
                    <Download size={20} />
                  </button>
                )}
                <button
                  onClick={close}
                  className="p-3 text-titanium/60 hover:text-titanium transition-colors"
                  aria-label={t.gallery.close}
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
                  aria-label={t.gallery.prev}
                  className="absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 p-4 text-titanium/50 hover:text-titanium transition-colors"
                >
                  <ChevronLeft size={30} />
                </button>
                <button
                  onClick={() => step(1)}
                  aria-label={t.gallery.next}
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
