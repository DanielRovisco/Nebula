import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Copy, Images, Plus } from 'lucide-react'
import { api } from '../../lib/gallery/api'
import type { Espaco, Gallery } from '../../lib/gallery/types'
import { SITE_URL } from '../../lib/site'
import NewGalleryForm from './NewGalleryForm'

/** 10 GB é o que o plano gratuito do Cloudflare R2 dá. */
const LIMITE_BYTES = 10 * 1024 ** 3

const gb = (bytes: number) => (bytes / 1024 ** 3).toFixed(bytes > 1024 ** 3 ? 1 : 2)

const RECADO: Record<string, string> = {
  nao_consegui_ler_o_privado: 'não consegui ler o espaço das galerias',
  nao_consegui_ler_o_site: 'não consegui ler o espaço das imagens do site',
  ficheiros_a_mais_para_contar: 'há ficheiros a mais para os contar todos',
  so_a_conta_da_base_de_dados: 'esta conta é só da base de dados e fica abaixo da verdade',
}

export default function GalleryList() {
  const [galleries, setGalleries] = useState<Gallery[] | null>(null)
  const [usado, setUsado] = useState<Espaco | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const refresh = () => {
    api
      .listGalleries()
      .then(setGalleries)
      .catch((e) => setError((e as Error).message))
    // O espaço é informação secundária: se falhar, não estraga a lista.
    api.storageUsed().then(setUsado).catch(() => setUsado(null))
  }

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

          {/*
            O espaço é de tudo o que está no R2, e o painel diz isso.

            O número sempre foi o total dos dois buckets — as galerias de
            cliente, a estação de impressão, os envios dos convidados e as
            imagens do site vivem lá todos. Mas lia-se debaixo do título
            "Galerias" como sendo só das galerias, e é assim que alguém sai para
            um casamento convencido de que tem espaço.
          */}
          {usado !== null && (
            <p className="text-sm text-titanium/45 mt-1.5">
              {/*
                Amarelo a partir dos 80%: é onde ainda dá para agir com calma,
                apagando galerias antigas em vez de a meio de uma entrega.
              */}
              <span className={usado.total / LIMITE_BYTES > 0.8 ? 'text-amber-300/80' : ''}>
                {gb(usado.total)} GB de {LIMITE_BYTES / 1024 ** 3} GB usados no total
              </span>
              {usado.galerias !== null && usado.eventos !== null && usado.site !== null && (
                <span className="text-titanium/30">
                  {' · '}galerias e impressão {gb(usado.galerias)}
                  {' · '}convidados {gb(usado.eventos)}
                  {' · '}site {gb(usado.site)}
                </span>
              )}
              {usado.incompleto && (
                <span className="block text-amber-300/80 mt-1">
                  Este número está por baixo da verdade
                  {usado.porque && RECADO[usado.porque] ? `: ${RECADO[usado.porque]}.` : '.'}
                  {' '}Não decidas por ele sem confirmar no painel do R2.
                </span>
              )}
            </p>
          )}
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
