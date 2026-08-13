import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, GripVertical, Trash2, Upload } from 'lucide-react'
import { api } from '../../lib/gallery/api'
import type { Gallery, Photo } from '../../lib/gallery/types'
import { SITE_URL } from '../../lib/site'
import { suggestPassword } from '../../lib/gallery/helpers'
import { DELIVERY_EDGE } from '../../lib/gallery/api'

export default function GalleryEditor() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [gallery, setGallery] = useState<Gallery | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [upload, setUpload] = useState<{ done: number; total: number } | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  // Ligado por omissão: uma galeria de entrega não precisa da resolução da
  // máquina, e reduzir é o que faz o armazenamento gratuito chegar.
  const [shrink, setShrink] = useState(true)
  const fileInput = useRef<HTMLInputElement>(null)

  const load = useCallback(() => {
    api
      .getGallery(id)
      .then(({ gallery, photos }) => {
        setGallery(gallery)
        setPhotos(photos)
      })
      .catch((e) => setError((e as Error).message))
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  function flash(msg: string) {
    setNotice(msg)
    setTimeout(() => setNotice(null), 2500)
  }

  async function patch(changes: Parameters<typeof api.updateGallery>[1]) {
    if (!gallery) return
    setSaving(true)
    setError(null)
    try {
      const updated = await api.updateGallery(gallery.id, changes)
      setGallery(updated)
      flash('Guardado.')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleFiles(list: FileList | null) {
    if (!list?.length || !gallery) return
    const files = Array.from(list).filter((f) => f.type.startsWith('image/'))
    if (!files.length) return
    setError(null)
    setUpload({ done: 0, total: files.length })
    try {
      await api.uploadPhotos(
        gallery.id,
        files,
        (done) => setUpload({ done, total: files.length }),
        { maxEdge: shrink ? DELIVERY_EDGE : null },
      )
      load()
      flash(`${files.length} ${files.length === 1 ? 'foto adicionada' : 'fotos adicionadas'}.`)
    } catch (e) {
      setError((e as Error).message)
      load()
    } finally {
      setUpload(null)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function removePhoto(photo: Photo) {
    if (!window.confirm(`Apagar ${photo.fileName}? Não há como recuperar.`)) return
    // Optimista: a grelha responde já, e um erro repõe o estado real.
    setPhotos((p) => p.filter((x) => x.id !== photo.id))
    try {
      await api.deletePhoto(photo.id)
    } catch (e) {
      setError((e as Error).message)
      load()
    }
  }

  async function removeGallery() {
    if (!gallery) return
    if (
      !window.confirm(
        `Apagar a galeria "${gallery.title}" e as suas ${photos.length} fotos? Não há como recuperar.`,
      )
    )
      return
    try {
      await api.deleteGallery(gallery.id)
      navigate('/admin')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  function move(from: number, to: number) {
    if (from === to || to < 0 || to >= photos.length) return
    const next = [...photos]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setPhotos(next)
    api.reorderPhotos(id, next.map((p) => p.id)).catch((e) => setError((e as Error).message))
  }

  function onDrop(target: number) {
    if (dragIndex === null) return
    move(dragIndex, target)
    setDragIndex(null)
  }

  if (!gallery) {
    return (
      <div className="container-px">
        {error ? (
          <p role="alert" className="text-sm text-titanium/75 border border-white/15 rounded-xl p-4">
            {error}
          </p>
        ) : (
          <p className="text-sm text-titanium/40">A carregar…</p>
        )}
      </div>
    )
  }

  const field =
    'w-full bg-transparent border-b border-white/15 py-2.5 outline-none focus:border-titanium/60 transition-colors placeholder:text-titanium/25'
  const link = `${SITE_URL}/galeria/${gallery.slug}`

  return (
    <div className="container-px">
      <Link
        to="/admin"
        className="inline-flex items-center gap-2 label-sm hover:text-titanium/70 transition-colors mb-8"
      >
        <ArrowLeft size={13} /> Todas as galerias
      </Link>

      <div className="flex items-end justify-between flex-wrap gap-4 mb-3">
        <h1 className="text-3xl sm:text-4xl">{gallery.title}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => patch({ published: !gallery.published })}
            disabled={saving}
            className={`px-6 py-3 rounded-full text-[11px] uppercase tracking-[0.18em] font-semibold transition-all min-h-[44px] active:scale-95 ${
              gallery.published
                ? 'border border-white/20 text-titanium/70 hover:border-white/40'
                : 'bg-titanium text-eerie'
            }`}
          >
            {gallery.published ? 'Despublicar' : 'Publicar'}
          </button>
        </div>
      </div>
      <p className="text-xs text-titanium/40 break-all mb-2">{link}</p>
      <p className="text-xs text-titanium/30 mb-10">
        {gallery.published
          ? 'Está acessível a quem tiver o link e a password.'
          : 'Em rascunho — não abre a ninguém, nem com a password certa.'}
      </p>

      {notice && <p className="text-xs text-emerald-300/80 mb-5">{notice}</p>}
      {error && (
        <p role="alert" className="text-sm text-titanium/75 border border-white/15 rounded-xl p-4 mb-6">
          {error}
        </p>
      )}

      {/* ── Fotografias ─────────────────────────────────────── */}
      <section className="mb-14">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
          <h2 className="text-xl">
            Fotografias <span className="text-titanium/35 text-base">({photos.length})</span>
          </h2>
          <button
            onClick={() => fileInput.current?.click()}
            disabled={Boolean(upload)}
            className="inline-flex items-center gap-2.5 bg-titanium text-eerie px-6 py-3 rounded-full text-[11px] uppercase tracking-[0.18em] font-semibold active:scale-95 transition-all min-h-[44px] disabled:opacity-60 disabled:cursor-wait"
          >
            <Upload size={14} />
            {upload ? `A enviar ${upload.done}/${upload.total}` : 'Adicionar fotos'}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        <label className="flex items-center gap-3 mb-5 cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={shrink}
            onChange={(e) => setShrink(e.target.checked)}
            className="w-4 h-4 accent-[#fcfff0]"
          />
          <span className="text-xs text-titanium/50">
            Reduzir para {DELIVERY_EDGE}px no lado maior — ocupa 3 a 5 vezes
            menos, sem diferença visível para o cliente
          </span>
        </label>

        {upload && (
          <div className="h-px bg-white/10 mb-6 overflow-hidden">
            <div
              className="h-full bg-titanium transition-[width] duration-300"
              style={{ width: `${Math.round((upload.done / upload.total) * 100)}%` }}
            />
          </div>
        )}

        {photos.length === 0 ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              handleFiles(e.dataTransfer.files)
            }}
            className="border border-dashed border-white/15 rounded-2xl p-12 text-center"
          >
            <Upload size={24} className="mx-auto text-titanium/25 mb-4" />
            <p className="text-sm text-titanium/45">
              Arrasta as fotos para aqui, ou usa o botão acima.
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-titanium/30 mb-4">
              Arrasta para reordenar, ou usa as setas em cada foto — o arrasto
              não funciona ao toque. É esta a ordem que o cliente vê.
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
              {photos.map((photo, i) => (
                <div
                  key={photo.id}
                  draggable
                  onDragStart={() => setDragIndex(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(i)}
                  onDragEnd={() => setDragIndex(null)}
                  className={`relative group rounded-lg overflow-hidden aspect-square bg-white/[0.04] cursor-grab active:cursor-grabbing ${
                    dragIndex === i ? 'opacity-40' : ''
                  }`}
                >
                  <img
                    src={photo.thumbPath ?? photo.storagePath}
                    alt={photo.fileName}
                    loading="lazy"
                    className="w-full h-full object-cover pointer-events-none"
                  />
                  <div className="absolute inset-0 bg-eerie/0 group-hover:bg-eerie/50 transition-colors" />
                  <GripVertical
                    size={15}
                    className="absolute top-1.5 left-1.5 text-titanium/0 group-hover:text-titanium/70 transition-colors pointer-events-none"
                  />
                  <button
                    onClick={() => removePhoto(photo)}
                    aria-label={`Apagar ${photo.fileName}`}
                    className="absolute top-1 right-1 p-2 text-titanium/70 sm:text-titanium/0 sm:group-hover:text-titanium/70 hover:!text-red-300 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>

                  {/*
                    O arrasto HTML5 não existe em ecrãs de toque, por isso a
                    ordenação ficaria impossível no telemóvel. As setas são
                    sempre visíveis ao toque e aparecem com o rato no desktop.
                  */}
                  <div className="absolute bottom-1 inset-x-1 flex justify-between sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => move(i, i - 1)}
                      disabled={i === 0}
                      aria-label={`Mover ${photo.fileName} para trás`}
                      className="p-1.5 rounded-full bg-eerie/70 text-titanium/80 hover:text-titanium disabled:opacity-0"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => move(i, i + 1)}
                      disabled={i === photos.length - 1}
                      aria-label={`Mover ${photo.fileName} para a frente`}
                      className="p-1.5 rounded-full bg-eerie/70 text-titanium/80 hover:text-titanium disabled:opacity-0"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                  <span className="absolute top-7 inset-x-0 px-1.5 text-[9px] text-titanium/0 group-hover:text-titanium/60 truncate transition-colors">
                    {photo.fileName}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* ── Definições ──────────────────────────────────────── */}
      <section className="mb-14 max-w-2xl">
        <h2 className="text-xl mb-6">Definições</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <label className="label-sm block mb-2.5" htmlFor="ge-title">Título</label>
            <input
              id="ge-title"
              defaultValue={gallery.title}
              onBlur={(e) => e.target.value !== gallery.title && patch({ title: e.target.value })}
              className={field}
            />
          </div>
          <div>
            <label className="label-sm block mb-2.5" htmlFor="ge-slug">Código (URL)</label>
            <input
              id="ge-slug"
              defaultValue={gallery.slug}
              onBlur={(e) => e.target.value !== gallery.slug && patch({ slug: e.target.value })}
              className={field}
            />
          </div>
          <div>
            <label className="label-sm block mb-2.5" htmlFor="ge-client">Cliente</label>
            <input
              id="ge-client"
              defaultValue={gallery.clientName ?? ''}
              onBlur={(e) =>
                e.target.value !== (gallery.clientName ?? '') && patch({ clientName: e.target.value })
              }
              className={field}
            />
          </div>
          <div>
            <label className="label-sm block mb-2.5" htmlFor="ge-expires">Expira em (opcional)</label>
            <input
              id="ge-expires"
              type="date"
              defaultValue={gallery.expiresAt ? gallery.expiresAt.slice(0, 10) : ''}
              onBlur={(e) =>
                patch({ expiresAt: e.target.value ? new Date(e.target.value).toISOString() : null })
              }
              className={`${field} [color-scheme:dark]`}
            />
          </div>
        </div>

        <div className="mt-6">
          <label className="label-sm block mb-2.5" htmlFor="ge-message">
            Mensagem para o cliente (opcional)
          </label>
          <textarea
            id="ge-message"
            rows={3}
            defaultValue={gallery.message ?? ''}
            onBlur={(e) =>
              e.target.value !== (gallery.message ?? '') && patch({ message: e.target.value })
            }
            className={`${field} resize-none`}
            placeholder="As primeiras do vosso dia. O resto segue durante a semana."
          />
        </div>

        <label className="flex items-center gap-3 mt-7 cursor-pointer">
          <input
            type="checkbox"
            checked={gallery.downloadEnabled}
            onChange={(e) => patch({ downloadEnabled: e.target.checked })}
            className="w-4 h-4 accent-[#fcfff0]"
          />
          <span className="text-sm text-titanium/70">Permitir download das fotografias</span>
        </label>
      </section>

      {/* ── Password ────────────────────────────────────────── */}
      <section className="mb-14 max-w-2xl">
        <h2 className="text-xl mb-2">Password</h2>
        <p className="text-xs text-titanium/35 mb-5 leading-relaxed">
          A password atual não pode ser lida — está guardada cifrada. Se o
          cliente a perder, define uma nova aqui.
        </p>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="label-sm block mb-2.5" htmlFor="ge-pass">Nova password</label>
            <input
              id="ge-pass"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={field}
              placeholder="deixa vazio para manter"
            />
          </div>
          <button
            type="button"
            onClick={() => setNewPassword(suggestPassword())}
            className="text-[10px] uppercase tracking-[0.15em] text-titanium/45 hover:text-titanium/80 transition-colors px-3 py-3"
          >
            Gerar
          </button>
          <button
            onClick={async () => {
              if (!newPassword) return
              await patch({ password: newPassword })
              setNewPassword('')
            }}
            disabled={!newPassword || saving}
            className="border border-white/20 px-6 py-3 rounded-full text-[11px] uppercase tracking-[0.18em] text-titanium/75 hover:border-white/40 transition-all min-h-[44px] disabled:opacity-40"
          >
            Alterar
          </button>
        </div>
      </section>

      {/* ── Zona perigosa ───────────────────────────────────── */}
      <section className="border-t border-white/[0.08] pt-8 max-w-2xl">
        <button
          onClick={removeGallery}
          className="inline-flex items-center gap-2.5 border border-red-400/25 text-red-300/80 px-6 py-3 rounded-full text-[11px] uppercase tracking-[0.18em] hover:border-red-400/50 hover:text-red-300 transition-all min-h-[44px]"
        >
          <Trash2 size={14} />
          Apagar galeria
        </button>
      </section>
    </div>
  )
}
