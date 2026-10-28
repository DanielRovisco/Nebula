import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { siteAdmin } from '../../lib/site-content/api'
import { publicUrl } from '../../lib/site-content/public'
import type { Historia } from '../../lib/site-content/types'
import { slugify } from '../../lib/gallery/helpers'

/**
 * As histórias, listadas.
 *
 * Uma história é um casamento contado do princípio ao fim. Vive aqui e não no
 * separador do Site porque é trabalho de outra natureza: o Site arruma
 * fotografias soltas e capas, isto escreve-se ao longo de dias e publica-se
 * quando estiver pronto.
 */
export default function HistoriaList() {
  const [historias, setHistorias] = useState<Historia[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [titulo, setTitulo] = useState('')
  const [aCriar, setACriar] = useState(false)

  const carregar = useCallback(() => {
    siteAdmin
      .listHistorias()
      .then(setHistorias)
      .catch((e) => setErro((e as Error).message))
  }, [])

  useEffect(carregar, [carregar])

  async function criar() {
    const nome = titulo.trim()
    if (!nome) return
    setACriar(true)
    setErro(null)
    try {
      await siteAdmin.criarHistoria(nome, slugify(nome))
      setTitulo('')
      carregar()
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setACriar(false)
    }
  }

  return (
    <div className="container-px">
      <h1 className="text-3xl sm:text-4xl mb-3">Histórias</h1>
      <p className="text-xs text-titanium/35 mb-10 leading-relaxed max-w-2xl">
        Um casamento contado do princípio ao fim. O portfólio mostra que sabemos
        fotografar; uma história mostra como é estar connosco um dia inteiro, e é
        isso que faz alguém escrever. Enquanto não a publicares, ela existe só
        aqui.
      </p>

      {erro && <p className="text-[13px] text-amber-300/80 mb-6">{erro}</p>}

      {/* Criar é só o nome. O resto escreve-se lá dentro, com calma. */}
      <div className="flex flex-wrap items-center gap-3 mb-10">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && criar()}
          placeholder="Ana & Tiago"
          className="bg-transparent border-b border-white/15 py-2.5 outline-none focus:border-titanium/60 transition-colors placeholder:text-titanium/25 min-w-[16rem]"
        />
        <button
          onClick={criar}
          disabled={!titulo.trim() || aCriar}
          className="inline-flex items-center gap-2.5 bg-titanium text-eerie px-6 py-3 rounded-full text-[11px] uppercase tracking-[0.18em] font-semibold active:scale-95 transition-all min-h-[44px] disabled:opacity-40"
        >
          <Plus size={14} /> Nova história
        </button>
      </div>

      {historias === null ? (
        <div className="h-32" />
      ) : historias.length === 0 ? (
        <p className="text-sm text-titanium/45">
          Ainda não há nenhuma. Escreve um nome aqui em cima para começar.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {historias.map((h) => (
            <Link
              key={h.id}
              to={`/admin/historias/${h.id}`}
              className="group block rounded-xl overflow-hidden border border-white/[0.08] hover:border-white/20 transition-colors"
            >
              <div className="aspect-[4/3] bg-white/[0.04] relative">
                {h.coverKey && (
                  <img
                    src={publicUrl(h.coverMediumKey ?? h.coverKey)}
                    alt=""
                    loading="lazy"
                    style={{ objectPosition: h.coverPos }}
                    className="w-full h-full object-cover"
                  />
                )}
                {!h.published && (
                  <span className="absolute top-2 left-2 px-2 py-1 rounded bg-eerie/80 text-[9px] uppercase tracking-[0.15em] text-amber-300/90">
                    Por publicar
                  </span>
                )}
              </div>
              <div className="p-4">
                <p className="text-titanium group-hover:text-titanium transition-colors truncate">
                  {h.title}
                </p>
                <p className="text-xs text-titanium/35 truncate mt-0.5">
                  {h.subtitle || `/historias/${h.slug}`}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
