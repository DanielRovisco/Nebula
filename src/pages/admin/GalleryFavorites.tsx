import { useCallback, useEffect, useState } from 'react'
import { Heart, RefreshCw } from 'lucide-react'
import { api } from '../../lib/gallery/api'
import type { Photo } from '../../lib/gallery/types'

/**
 * As fotografias que o cliente marcou na galeria dele.
 *
 * É para isto que serve o coração do lado do cliente: em vez de recebermos por
 * email uma lista de nomes de ficheiro para depois procurar um a um, a escolha
 * dele aparece aqui feita.
 */
export default function GalleryFavorites({
  galleryId,
  photos,
}: {
  galleryId: string
  photos: Photo[]
}) {
  const [ids, setIds] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let vivo = true
    api
      .listFavorites(galleryId)
      .then((f) => vivo && setIds(f))
      .catch((e) => vivo && setError((e as Error).message))
      .finally(() => vivo && setBusy(false))
    return () => {
      vivo = false
    }
  }, [galleryId, tick])

  const carregar = useCallback(() => {
    setBusy(true)
    setTick((t) => t + 1)
  }, [])

  // Pela ordem da galeria, não pela ordem em que foram marcadas: é assim que
  // elas aparecem ao cliente e é assim que as vamos procurar.
  const escolhidas = ids ? photos.filter((p) => ids.includes(p.id)) : []

  return (
    <section className="mb-14 max-w-2xl">
      <div className="flex items-end justify-between gap-4 mb-2">
        <h2 className="text-xl">
          Escolhidas pelo cliente
          {escolhidas.length > 0 && (
            <span className="text-titanium/35 text-base"> ({escolhidas.length})</span>
          )}
        </h2>
        <button
          onClick={carregar}
          disabled={busy}
          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-titanium/45 hover:text-titanium/80 transition-colors px-3 py-2 disabled:opacity-40"
        >
          <RefreshCw size={12} className={busy ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>
      <p className="text-xs text-titanium/35 mb-6 leading-relaxed">
        {ids === null
          ? 'A carregar…'
          : escolhidas.length === 0
            ? 'O cliente ainda não marcou nenhuma fotografia.'
            : 'Marcadas com coração na galeria — normalmente as que o cliente quer no álbum.'}
      </p>

      {error && (
        <p role="alert" className="text-sm text-titanium/75 border border-white/15 rounded-xl p-4">
          {error}
        </p>
      )}

      {escolhidas.length > 0 && (
        <>
          <ul className="border border-white/10 rounded-2xl divide-y divide-white/[0.07] overflow-hidden mb-4">
            {escolhidas.map((p) => (
              <li key={p.id} className="flex items-center gap-4 px-5 py-3">
                <Heart size={14} className="text-titanium/60 shrink-0" fill="currentColor" />
                <span className="text-sm text-titanium/75 min-w-0 flex-1 break-all">
                  {p.fileName}
                </span>
              </li>
            ))}
          </ul>

          {/* Copiar a lista dá jeito para a levar para o laboratório do álbum. */}
          <button
            onClick={() =>
              navigator.clipboard
                ?.writeText(escolhidas.map((p) => p.fileName).join('\n'))
                .catch(() => setError('O browser não deixou copiar. Seleciona a lista à mão.'))
            }
            className="text-[10px] uppercase tracking-[0.15em] text-titanium/45 hover:text-titanium/80 transition-colors px-3 py-2"
          >
            Copiar lista de nomes
          </button>
        </>
      )}
    </section>
  )
}
