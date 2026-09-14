import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useParams } from 'react-router-dom'
import { ArrowLeft, ImagePlus, Trash2 } from 'lucide-react'
import QrNebula from '../../components/QrNebula'
import { SITE_URL } from '../../lib/site'
import {
  type FotoMostra, type Mostra,
  apagarFoto, apagarMostra, assinarMiniaturas, carregarFotos, estaAberta,
  fechar, lerMostra, listarFotos, reabrir,
} from '../../lib/impressao/admin'

const quando = (iso: string) =>
  new Date(iso).toLocaleString('pt-PT', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })

/**
 * A mesa, do nosso lado.
 *
 * Esta página é usada de pé, ao lado de uma impressora, com pressa e com uma
 * mão. É essa a única situação para que foi desenhada: uma área grande para
 * largar ficheiros, as últimas por cima, o número bem visível em cada uma, e o
 * código QR à mão para reimprimir o cartão se alguém o entornar.
 */
export default function PrintEditor() {
  const { id = '' } = useParams()
  const [mostra, setMostra] = useState<Mostra | null>(null)
  const [fotos, setFotos] = useState<FotoMostra[]>([])
  const [aArrastar, setAArrastar] = useState(false)
  const [progresso, setProgresso] = useState<{ feitas: number; total: number } | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const escolher = useRef<HTMLInputElement>(null)

  const recarregar = useCallback(
    () =>
      Promise.all([lerMostra(id), listarFotos(id)])
        .then(async ([m, f]) => {
          setMostra(m)
          setFotos(await assinarMiniaturas(f))
        })
        // O painel já está desenhado com o que tinha: uma leitura falhada não
        // pode deixar a mesa sem interface a meio de um casamento.
        .catch(() => {}),
    [id],
  )

  useEffect(() => { recarregar() }, [recarregar])

  async function aceitar(ficheiros: File[]) {
    const imagens = ficheiros.filter((f) => f.type.startsWith('image/'))
    if (!imagens.length) return
    setAviso(null)
    setProgresso({ feitas: 0, total: imagens.length })
    const r = await carregarFotos(id, imagens, (feitas, total) => setProgresso({ feitas, total }))
    setProgresso(null)
    if (r.falharam.length) {
      setAviso(`${r.entraram} entraram. Falharam ${r.falharam.length}: ${r.falharam
        .slice(0, 3).map((f) => f.nome).join(', ')}${r.falharam.length > 3 ? '…' : ''}`)
    }
    await recarregar().catch(() => {})
  }

  if (!mostra) return <div className="container-px min-h-[40vh]" />

  const aberta = estaAberta(mostra)
  const endereco = `${SITE_URL}/p/${mostra.slug}`

  return (
    <div className="container-px pb-24">
      <Link
        to="/admin/impressao"
        className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-titanium/50 hover:text-titanium/80 transition-colors"
      >
        <ArrowLeft size={13} /> Mostras
      </Link>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl">{mostra.name}</h1>
          <p className="text-xs text-titanium/40 mt-2">
            {endereco} ·{' '}
            {aberta
              ? 'aberta'
              : `fechada ${mostra.expires_at ? `às ${quando(mostra.expires_at)}` : ''}`}
          </p>
        </div>

        {/*
          O código QR aqui e não noutra página: o cartão em cima da mesa
          desaparece debaixo de um copo pelo menos uma vez por casamento, e
          quem está na mesa não pode ir procurá-lo a outro sítio do painel.
        */}
        <div className="bg-white rounded-xl p-3">
          <QrNebula url={endereco} tamanho={320} cor="preto" fundo="#ffffff" className="w-28 h-28" />
        </div>
      </div>

      {/* Largar aqui */}
      <button
        onClick={() => escolher.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setAArrastar(true) }}
        onDragLeave={() => setAArrastar(false)}
        onDrop={(e) => {
          e.preventDefault()
          setAArrastar(false)
          void aceitar(Array.from(e.dataTransfer.files))
        }}
        disabled={Boolean(progresso)}
        className={`w-full mt-8 rounded-2xl border border-dashed p-10 flex flex-col items-center gap-3 transition-colors ${
          aArrastar ? 'border-titanium/55 bg-white/[0.07]' : 'border-white/15 bg-white/[0.02] hover:border-white/30'
        } disabled:opacity-60`}
      >
        <span className="w-12 h-12 rounded-full bg-titanium text-eerie flex items-center justify-center">
          <ImagePlus size={20} />
        </span>
        <span className="font-serif text-2xl">
          {progresso ? `${progresso.feitas} de ${progresso.total}` : 'Largar fotografias'}
        </span>
        <span className="text-xs text-titanium/40 text-center leading-relaxed max-w-sm">
          Numeradas por ordem de entrada. Sobem reduzidas e com o número
          queimado na imagem; o original fica neste computador.
        </span>
      </button>

      <input
        ref={escolher}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => {
          void aceitar(Array.from(e.target.files ?? []))
          // Sem isto, escolher o mesmo ficheiro duas vezes seguidas não dispara
          // nada: o input guarda o valor anterior.
          e.target.value = ''
        }}
      />

      {progresso && (
        <div className="mt-4 h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-titanium transition-[width] duration-300"
            style={{ width: `${(progresso.feitas / progresso.total) * 100}%` }}
          />
        </div>
      )}

      {aviso && <p className="mt-4 text-sm text-amber-200/80">{aviso}</p>}

      {/* As fotografias, as últimas primeiro. */}
      <div className="mt-10 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        {fotos.map((f) => (
          <div key={f.id} className="relative group aspect-square rounded-lg overflow-hidden bg-white/5">
            {f.thumbUrl && (
              <img src={f.thumbUrl} alt={`Número ${f.numero}`} className="w-full h-full object-cover" />
            )}
            <button
              onClick={async () => {
                if (!confirm(`Apagar a ${String(f.numero).padStart(3, '0')}? O número não volta a ser usado.`)) return
                await apagarFoto(f)
                setFotos((antigas) => antigas.filter((x) => x.id !== f.id))
              }}
              aria-label={`Apagar a fotografia ${f.numero}`}
              className="absolute top-1.5 right-1.5 w-8 h-8 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {!fotos.length && !progresso && (
        <p className="mt-10 text-titanium/40 leading-relaxed">
          Ainda sem fotografias. As que largares aqui aparecem na mostra em
          segundos, e o telemóvel de quem estiver com a página aberta atualiza-se
          sozinho.
        </p>
      )}

      {/*
        Abrir e fechar, à mão.

        Não há relógio nenhum a fechar isto: enquanto estiver aberta, está
        aberta, e quem tiver o endereço vê as fotografias. É uma escolha, e o
        botão está aqui porque a decisão é de quem está na mesa e não de um
        temporizador que ninguém se lembra de ter posto.
      */}
      <div className="mt-16 border-t border-white/10 pt-8 flex flex-wrap items-center gap-3">
        {aberta ? (
          <button
            onClick={async () => {
              if (!confirm('Fechar a mostra? Os telemóveis deixam de ver as fotografias.')) return
              await fechar(mostra.id)
              await recarregar()
            }}
            className="px-5 py-3 rounded-full border border-white/15 text-[11px] uppercase tracking-[0.14em] min-h-[44px]"
          >
            Fechar a mostra
          </button>
        ) : (
          <>
            <button
              onClick={async () => {
                await reabrir(mostra.id)
                await recarregar()
              }}
              className="px-5 py-3 rounded-full border border-white/15 text-[11px] uppercase tracking-[0.14em] min-h-[44px]"
            >
              Voltar a abrir
            </button>
            <p className="text-sm text-titanium/40">
              Fechada. As fotografias continuam a ocupar espaço até serem apagadas.
            </p>
          </>
        )}
        <button
          onClick={async () => {
            if (!confirm('Apagar a mostra e todas as fotografias? Não há como voltar atrás.')) return
            await apagarMostra(mostra.id)
            window.location.href = '/admin/impressao'
          }}
          className="px-5 py-3 rounded-full border border-red-400/25 text-red-200/70 text-[11px] uppercase tracking-[0.14em] min-h-[44px]"
        >
          Apagar tudo
        </button>
      </div>
    </div>
  )
}
