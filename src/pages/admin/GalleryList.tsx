import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Copy, Images, Plus } from 'lucide-react'
import { api } from '../../lib/gallery/api'
import type { Gallery } from '../../lib/gallery/types'
import { SITE_URL } from '../../lib/site'
import NewGalleryForm from './NewGalleryForm'

export default function GalleryList() {
  const [galleries, setGalleries] = useState<Gallery[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const refresh = () =>
    api
      .listGalleries()
      .then(setGalleries)
      .catch((e) => setError((e as Error).message))

  useEffect(() => {
    refresh()
  }, [])

  async function copyLink(slug: string) {
    const url = `${SITE_URL}/galeria/${slug}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(slug)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      window.prompt('Copiar o link da galeria:', url)
    }
  }

  return (
    <div className="container-px">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl">Galerias</h1>
          <p className="text-sm text-titanium/45 mt-2">
            {galleries ? `${galleries.length} no total` : 'A carregar…'}
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2.5 bg-titanium text-eerie px-6 py-3 rounded-full text-[11px] uppercase tracking-[0.18em] font-semibold active:scale-95 transition-all min-h-[44px]"
        >
          <Plus size={15} />
          Nova galeria
        </button>
      </div>

      {creating && (
        <NewGalleryForm
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false)
            refresh()
          }}
        />
      )}

      {error && (
        <p role="alert" className="text-sm text-titanium/75 border border-white/15 rounded-xl p-4 mb-8">
          {error}
        </p>
      )}

      {galleries && galleries.length === 0 && !creating && (
        <div className="border border-white/10 rounded-2xl p-10 text-center">
          <Images size={26} className="mx-auto text-titanium/25 mb-4" />
          <p className="text-titanium/50 text-sm">
            Ainda não há galerias. Cria a primeira e envia o link ao cliente.
          </p>
        </div>
      )}

      <div className="grid gap-3">
        {galleries?.map((g) => (
          <div
            key={g.id}
            className="border border-white/10 rounded-2xl p-5 sm:p-6 hover:border-white/20 transition-colors flex flex-wrap items-center gap-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <Link to={`/admin/${g.id}`} className="text-lg hover:text-titanium transition-colors">
                  {g.title}
                </Link>
                <span
                  className={`text-[10px] uppercase tracking-[0.18em] px-2.5 py-1 rounded-full border ${
                    g.published
                      ? 'border-emerald-400/30 text-emerald-300/80'
                      : 'border-white/15 text-titanium/40'
                  }`}
                >
                  {g.published ? 'Publicada' : 'Rascunho'}
                </span>
                {g.expiresAt && new Date(g.expiresAt) < new Date() && (
                  <span className="text-[10px] uppercase tracking-[0.18em] px-2.5 py-1 rounded-full border border-red-400/30 text-red-300/80">
                    Expirada
                  </span>
                )}
              </div>
              <p className="text-xs text-titanium/40 mt-2 break-all">
                /galeria/{g.slug}
                {g.clientName ? ` · ${g.clientName}` : ''}
                {g.photoCount !== undefined ? ` · ${g.photoCount} fotos` : ''}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => copyLink(g.slug)}
                className="inline-flex items-center gap-2 border border-white/15 px-4 py-2.5 rounded-full text-[10px] uppercase tracking-[0.15em] text-titanium/60 hover:border-white/40 hover:text-titanium/90 transition-all min-h-[40px]"
              >
                {copied === g.slug ? <Check size={13} /> : <Copy size={13} />}
                {copied === g.slug ? 'Copiado' : 'Link'}
              </button>
              <Link
                to={`/admin/${g.id}`}
                className="inline-flex items-center border border-white/15 px-4 py-2.5 rounded-full text-[10px] uppercase tracking-[0.15em] text-titanium/60 hover:border-white/40 hover:text-titanium/90 transition-all min-h-[40px]"
              >
                Abrir
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
