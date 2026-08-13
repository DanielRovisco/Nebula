import { useState } from 'react'
import { api } from '../../lib/gallery/api'
import { slugify, suggestPassword } from '../../lib/gallery/helpers'

interface Props {
  onClose: () => void
  onCreated: () => void
}

export default function NewGalleryForm({ onClose, onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [clientName, setClientName] = useState('')
  const [password, setPassword] = useState(suggestPassword)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const field =
    'w-full bg-transparent border-b border-white/15 py-2.5 text-base outline-none focus:border-titanium/60 transition-colors placeholder:text-titanium/25'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.createGallery({
        title: title.trim(),
        slug: (slugTouched ? slug : slugify(title)).trim(),
        clientName: clientName.trim() || undefined,
        password,
      })
      onCreated()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="border border-white/15 rounded-2xl p-6 sm:p-7 mb-8 bg-white/[0.02]"
    >
      <h2 className="text-xl mb-6">Nova galeria</h2>

      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <label className="label-sm block mb-2.5" htmlFor="ng-title">Título</label>
          <input
            id="ng-title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={field}
            placeholder="Ana & Tiago"
          />
        </div>
        <div>
          <label className="label-sm block mb-2.5" htmlFor="ng-slug">Código (URL)</label>
          <input
            id="ng-slug"
            required
            value={slugTouched ? slug : slugify(title)}
            onChange={(e) => {
              setSlugTouched(true)
              setSlug(slugify(e.target.value))
            }}
            className={field}
            placeholder="ana-e-tiago"
          />
        </div>
        <div>
          <label className="label-sm block mb-2.5" htmlFor="ng-client">Cliente (opcional)</label>
          <input
            id="ng-client"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className={field}
            placeholder="Ana Ferreira"
          />
        </div>
        <div>
          <label className="label-sm block mb-2.5" htmlFor="ng-pass">Password</label>
          <div className="flex items-center gap-3">
            <input
              id="ng-pass"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={field}
            />
            <button
              type="button"
              onClick={() => setPassword(suggestPassword())}
              className="text-[10px] uppercase tracking-[0.15em] text-titanium/45 hover:text-titanium/80 transition-colors whitespace-nowrap px-2 py-2"
            >
              Gerar
            </button>
          </div>
        </div>
      </div>

      <p className="text-xs text-titanium/35 mt-5 leading-relaxed">
        A galeria nasce como rascunho — não abre a ninguém até a publicares.
        Guarda esta password: fica cifrada no servidor e não há forma de a
        voltar a ler, só de a substituir.
      </p>

      {error && (
        <p role="alert" className="text-sm text-titanium/75 border border-white/15 rounded-xl p-3 mt-5">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 mt-7">
        <button
          type="submit"
          disabled={busy}
          className="bg-titanium text-eerie px-7 py-3 rounded-full text-[11px] uppercase tracking-[0.18em] font-semibold active:scale-95 transition-all min-h-[44px] disabled:opacity-60"
        >
          {busy ? 'A criar…' : 'Criar galeria'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-[11px] uppercase tracking-[0.18em] text-titanium/45 hover:text-titanium/80 transition-colors px-4 py-3"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
