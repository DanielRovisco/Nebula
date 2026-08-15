import { useCallback, useEffect, useState } from 'react'
import { Download, Eye, Package, RefreshCw } from 'lucide-react'
import { api } from '../../lib/gallery/api'
import type { GalleryEvent } from '../../lib/gallery/types'

/** "há 3 horas", "ontem", "12 de março" — conforme a distância. */
function quando(iso: string) {
  const d = new Date(iso)
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'agora mesmo'
  if (mins < 60) return `há ${mins} min`
  const horas = Math.round(mins / 60)
  if (horas < 24) return `há ${horas} ${horas === 1 ? 'hora' : 'horas'}`
  const dias = Math.round(horas / 24)
  if (dias === 1) return 'ontem'
  if (dias < 7) return `há ${dias} dias`
  return d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })
}

const DESCRICAO: Record<GalleryEvent['kind'], { icon: typeof Eye; texto: (e: GalleryEvent) => string }> = {
  open: { icon: Eye, texto: () => 'Cliente abriu a galeria' },
  download_all: { icon: Package, texto: () => 'Cliente descarregou o álbum completo' },
  download_one: {
    icon: Download,
    texto: (e) => `Cliente descarregou ${e.fileName ?? 'um ficheiro'}`,
  },
}

export default function GalleryActivity({ galleryId }: { galleryId: string }) {
  const [events, setEvents] = useState<GalleryEvent[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // O botão de atualizar incrementa este contador; o efeito reage a ele. Assim
  // o setState de arranque fica no handler e não no corpo do efeito.
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let vivo = true
    api
      .listEvents(galleryId)
      .then((e) => vivo && setEvents(e))
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

  const downloads = events?.filter((e) => e.kind !== 'open').length ?? 0
  const aberturas = events?.filter((e) => e.kind === 'open').length ?? 0

  return (
    <section className="mb-14 max-w-2xl">
      <div className="flex items-end justify-between gap-4 mb-2">
        <h2 className="text-xl">Atividade</h2>
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
        {events === null
          ? 'A carregar…'
          : events.length === 0
            ? 'Ainda não há registo — o cliente não abriu a galeria.'
            : `${aberturas} ${aberturas === 1 ? 'abertura' : 'aberturas'} · ${downloads} ${
                downloads === 1 ? 'download' : 'downloads'
              }`}
      </p>

      {error && (
        <p role="alert" className="text-sm text-titanium/75 border border-white/15 rounded-xl p-4">
          {error}
        </p>
      )}

      {events && events.length > 0 && (
        <ul className="border border-white/10 rounded-2xl divide-y divide-white/[0.07] overflow-hidden">
          {events.map((e) => {
            const d = DESCRICAO[e.kind]
            if (!d) return null
            const Icon = d.icon
            return (
              <li key={e.id} className="flex items-center gap-4 px-5 py-3.5">
                <Icon
                  size={15}
                  className={e.kind === 'open' ? 'text-titanium/30 shrink-0' : 'text-emerald-300/70 shrink-0'}
                />
                <span className="text-sm text-titanium/75 min-w-0 flex-1 break-words">
                  {d.texto(e)}
                </span>
                <span className="text-xs text-titanium/30 whitespace-nowrap">{quando(e.at)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
