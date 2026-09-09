import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import {
  type Evento, JANELA_DIAS, criarEvento, listarEventos, slugificar,
} from '../../lib/evento/admin'

const gb = (b: number) => `${(b / 1024 ** 3).toFixed(1)} GB`

/** Leitura do relógio, fora do componente: não é estado do React. */
const aindaAberto = (iso: string) => new Date(iso).getTime() > Date.now()

const formatar = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })

/**
 * A lista de casamentos com partilha aberta.
 *
 * É uma página à parte das galerias de cliente porque são duas coisas
 * diferentes: uma galeria é o trabalho entregue, um evento é o que os
 * convidados deixaram lá. Misturá-las na mesma lista dava uma lista onde
 * metade das linhas se comportava de outra maneira.
 */
export default function EventList() {
  const [eventos, setEventos] = useState<Evento[] | null>(null)
  const [aCriar, setACriar] = useState(false)

  useEffect(() => { listarEventos().then(setEventos).catch(() => setEventos([])) }, [])

  if (!eventos) return <div className="container-px min-h-[40vh]" />

  return (
    <div className="container-px pb-24">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl">Casamentos</h1>
        <button
          onClick={() => setACriar(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-titanium text-eerie text-[11px] uppercase tracking-[0.12em] hover:bg-titanium/90 transition-colors min-h-[44px]"
        >
          <Plus size={14} /> Novo
        </button>
      </div>

      {aCriar && (
        <Formulario
          aoFechar={() => setACriar(false)}
          aoCriar={(e) => { setEventos([e, ...eventos]); setACriar(false) }}
        />
      )}

      {eventos.length === 0 && !aCriar && (
        <p className="text-titanium/45 mt-8 leading-relaxed max-w-md">
          Ainda não há nenhum. Um evento dá aos convidados um link e um código
          para deixarem as fotografias deles, sem terem de criar conta.
        </p>
      )}

      <ul className="mt-8 space-y-2">
        {eventos.map((e) => {
          const aberto = aindaAberto(e.upload_window_ends_at)
          return (
            <li key={e.id}>
              <Link
                to={`/admin/eventos/${e.id}`}
                className="flex items-center gap-4 px-4 py-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${aberto ? 'bg-titanium/70' : 'bg-titanium/15'}`} />
                <span className="flex-1 min-w-0">
                  <span className="block truncate">{e.couple_name}</span>
                  <span className="block text-xs text-titanium/35 mt-0.5">
                    {formatar(e.event_date)} · /e/{e.slug}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-titanium/35 text-right">
                  {gb(e.bytes_used)}
                  <span className="block mt-0.5">
                    {aberto ? `fecha ${formatar(e.upload_window_ends_at)}` : 'fechado'}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Formulario({ aoFechar, aoCriar }: { aoFechar: () => void; aoCriar: (e: Evento) => void }) {
  const [nome, setNome] = useState('')
  const [slug, setSlug] = useState('')
  const [data, setData] = useState('')
  const [moderacao, setModeracao] = useState(false)
  const [convidadosVeem, setConvidadosVeem] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  // O slug segue o nome enquanto ninguém lhe tocar. Quem o quiser diferente
  // escreve-o, e a partir daí deixa de ser reescrito por baixo dos dedos.
  const [slugManual, setSlugManual] = useState(false)
  const slugFinal = slugManual ? slug : slugificar(nome)

  const submeter = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!nome.trim() || !data || !slugFinal) return
    setOcupado(true)
    setErro(null)
    try {
      /*
        A janela fecha 90 dias depois do casamento, e não 90 dias depois de
        hoje: um evento criado com dois meses de antecedência tinha, de outra
        forma, uma janela que fechava antes de os convidados chegarem à festa.
      */
      const fim = new Date(`${data}T23:59:59`)
      fim.setDate(fim.getDate() + JANELA_DIAS)
      aoCriar(await criarEvento({
        couple_name: nome.trim(),
        slug: slugFinal,
        event_date: data,
        upload_window_ends_at: fim.toISOString(),
        moderation: moderacao,
        guests_see_gallery: convidadosVeem,
        reveal_at: null,
      }))
    } catch (e) {
      const m = (e as { message?: string }).message ?? ''
      setErro(m.includes('duplicate') || m.includes('unique')
        ? 'Já existe um evento com este endereço.'
        : 'Não foi possível criar. Tenta outra vez.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <form onSubmit={submeter} className="mt-6 p-5 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-4">
      <Campo etiqueta="Nome do casal">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Joana e Miguel"
          autoFocus
          className={ENTRADA}
        />
      </Campo>

      <Campo etiqueta="Endereço">
        <div className="flex items-center gap-1 mt-2">
          <span className="text-titanium/30 text-sm shrink-0">/e/</span>
          <input
            value={slugFinal}
            onChange={(e) => { setSlugManual(true); setSlug(slugificar(e.target.value)) }}
            placeholder="joana-e-miguel"
            className={`${ENTRADA} mt-0`}
          />
        </div>
      </Campo>

      <Campo etiqueta="Data do casamento">
        <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={ENTRADA} />
      </Campo>

      <Interruptor
        ligado={convidadosVeem}
        aoMudar={setConvidadosVeem}
        titulo="Os convidados veem a galeria"
        nota="Desligado, cada um vê só o que carregou. Os noivos veem sempre tudo."
      />
      <Interruptor
        ligado={moderacao}
        aoMudar={setModeracao}
        titulo="Aprovar antes de aparecer"
        nota="Dá trabalho durante a festa. Costuma valer mais deixar entrar e apagar depois."
      />

      {erro && <p className="text-sm text-titanium/70">{erro}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={ocupado || !nome.trim() || !data}
          className="px-5 py-2.5 rounded-full bg-titanium text-eerie text-[11px] uppercase tracking-[0.12em] disabled:opacity-30 min-h-[44px]"
        >
          Criar
        </button>
        <button type="button" onClick={aoFechar} className="px-5 py-2.5 text-[11px] uppercase tracking-[0.12em] text-titanium/40 hover:text-titanium/70 transition-colors min-h-[44px]">
          Cancelar
        </button>
      </div>
    </form>
  )
}

const ENTRADA =
  'w-full mt-2 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-titanium/85 placeholder:text-titanium/25 focus:border-white/30 outline-none transition-colors'

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label-sm">{etiqueta}</span>
      {children}
    </label>
  )
}

export function Interruptor({
  ligado, aoMudar, titulo, nota,
}: { ligado: boolean; aoMudar: (v: boolean) => void; titulo: string; nota: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      onClick={() => aoMudar(!ligado)}
      className="w-full flex items-start gap-3 text-left group"
    >
      <span className={`mt-0.5 w-9 h-5 rounded-full shrink-0 transition-colors ${ligado ? 'bg-titanium/80' : 'bg-white/10'}`}>
        <span className={`block w-4 h-4 mt-0.5 rounded-full bg-eerie transition-transform ${ligado ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm text-titanium/80">{titulo}</span>
        <span className="block text-xs text-titanium/35 mt-0.5 leading-relaxed">{nota}</span>
      </span>
    </button>
  )
}
