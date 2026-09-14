import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import {
  type Mostra, criarMostra, estaAberta, listarMostras, slugificar,
} from '../../lib/impressao/admin'

/**
 * As mostras da estação de impressão.
 *
 * Lista à parte dos casamentos e das galerias, porque é outra coisa: uma
 * galeria é o trabalho entregue, um casamento é o que os convidados deixaram, e
 * uma mostra é uma mesa que existe durante uma noite e depois desaparece.
 * Misturá-las dava uma lista onde um terço das linhas se comportava de outra
 * maneira.
 */
export default function PrintList() {
  const [mostras, setMostras] = useState<Mostra[] | null>(null)
  const [aCriar, setACriar] = useState(false)

  useEffect(() => { listarMostras().then(setMostras).catch(() => setMostras([])) }, [])

  if (!mostras) return <div className="container-px min-h-[40vh]" />

  return (
    <div className="container-px pb-24">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl">Impressão ao vivo</h1>
        <button
          onClick={() => setACriar(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-titanium text-eerie text-[11px] uppercase tracking-[0.12em] hover:bg-titanium/90 transition-colors min-h-[44px]"
        >
          <Plus size={14} /> Nova
        </button>
      </div>

      {aCriar && (
        <Formulario
          aoFechar={() => setACriar(false)}
          aoCriar={(m) => { setMostras([m, ...mostras]); setACriar(false) }}
        />
      )}

      {mostras.length === 0 && !aCriar && (
        <p className="text-titanium/45 mt-8 leading-relaxed max-w-md">
          Ainda não há nenhuma. Uma mostra é a mesa de impressão da festa: nós
          carregamos as fotografias numeradas, os convidados vêem-nas no
          telemóvel pelo código QR e dizem o número de que gostam.
        </p>
      )}

      <ul className="mt-8 space-y-2">
        {mostras.map((m) => {
          const aberta = estaAberta(m)
          return (
            <li key={m.id}>
              <Link
                to={`/admin/impressao/${m.id}`}
                className="flex items-center justify-between gap-4 border border-white/10 rounded-xl px-5 py-4 hover:border-white/25 transition-colors"
              >
                <div className="min-w-0">
                  <p className="truncate">{m.name}</p>
                  <p className="text-xs text-titanium/40 mt-1 truncate">
                    /p/{m.slug} · {m.next_number - 1} fotografias
                  </p>
                </div>
                <span
                  className={`shrink-0 text-[10px] uppercase tracking-[0.14em] px-3 py-1.5 rounded-full border ${
                    aberta
                      ? 'border-emerald-400/30 text-emerald-200/80'
                      : 'border-white/10 text-titanium/35'
                  }`}
                >
                  {aberta ? 'aberta' : 'fechada'}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Formulario({
  aoFechar, aoCriar,
}: {
  aoFechar: () => void
  aoCriar: (m: Mostra) => void
}) {
  const [nome, setNome] = useState('')
  const [slug, setSlug] = useState('')
  const [data, setData] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aGravar, setAGravar] = useState(false)

  // O endereço segue o nome enquanto ninguém lhe tocar à mão.
  const [tocado, setTocado] = useState(false)
  const slugFinal = tocado ? slugificar(slug) : slugificar(nome)

  async function gravar(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !slugFinal) return setErro('Falta o nome.')
    setAGravar(true)
    setErro(null)
    try {
      aoCriar(await criarMostra({
        name: nome.trim(),
        slug: slugFinal,
        eventDate: data || null,
      }))
    } catch (e2) {
      setErro((e2 as Error).message)
      setAGravar(false)
    }
  }

  const campo =
    'w-full bg-transparent border-b border-white/15 py-2.5 outline-none focus:border-titanium/60 transition-colors'

  return (
    <form onSubmit={gravar} className="mt-6 border border-white/12 rounded-2xl p-6 space-y-6">
      <div>
        <label className="label-sm block mb-2" htmlFor="mostra-nome">Nome</label>
        <input
          id="mostra-nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ana & Tiago"
          className={campo}
          autoFocus
        />
      </div>

      <div>
        <label className="label-sm block mb-2" htmlFor="mostra-slug">Endereço</label>
        <input
          id="mostra-slug"
          value={tocado ? slug : slugFinal}
          onChange={(e) => { setTocado(true); setSlug(e.target.value) }}
          className={campo}
        />
        <p className="text-xs text-titanium/40 mt-2">
          proj3ctnebula.pt/p/{slugFinal || '…'} · não pode mudar depois, porque
          vai impresso no código que fica em cima da mesa.
        </p>
      </div>

      <div>
        <label className="label-sm block mb-2" htmlFor="mostra-data">Data</label>
        <input
          id="mostra-data"
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className={`${campo} [color-scheme:dark] sm:max-w-xs`}
        />
      </div>

      <p className="text-xs text-titanium/40 leading-relaxed">
        Nasce aberta e fica aberta. Nada a fecha sozinha: fechas tu, quando
        quiseres, e podes voltar a abrir depois.
      </p>

      {erro && <p className="text-sm text-red-300/80">{erro}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={aGravar}
          className="px-6 py-3 rounded-full bg-titanium text-eerie text-[11px] uppercase tracking-[0.14em] disabled:opacity-60 min-h-[44px]"
        >
          {aGravar ? 'A criar…' : 'Criar'}
        </button>
        <button
          type="button"
          onClick={aoFechar}
          className="px-6 py-3 rounded-full border border-white/15 text-[11px] uppercase tracking-[0.14em] min-h-[44px]"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
