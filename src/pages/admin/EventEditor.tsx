import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Copy, Download, EyeOff, Trash2 } from 'lucide-react'
import QrNebula from '../../components/QrNebula'
import { guardarQr } from '../../lib/qr/guardar'
import {
  type Evento, type MediaAdmin,
  apagarEvento, apagarMedia, assinar, guardarEvento, lerEvento, listarMedia, mudarEstado,
} from '../../lib/evento/admin'
import { Interruptor } from './EventList'
import { absoluteUrl } from '../../lib/site'

const ZIP = import.meta.env.VITE_ZIP_WORKER_URL as string | undefined

const gb = (b: number) => `${(b / 1024 ** 3).toFixed(2)} GB`

/** Se a janela de envios ainda está aberta. Depende da hora, por isso vive fora
 *  do corpo do componente: é uma leitura do relógio, não estado do React. */
const aindaAberto = (iso: string) => new Date(iso).getTime() > Date.now()

type Aba = 'aprovado' | 'pendente' | 'escondido'

/**
 * A página de um casamento: o código para imprimir, o que os convidados
 * deixaram, e o botão que entrega tudo aos noivos.
 */
export default function EventEditor() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [evento, setEvento] = useState<Evento | null>(null)
  const [media, setMedia] = useState<MediaAdmin[]>([])
  const [aba, setAba] = useState<Aba>('aprovado')
  const [escolhidos, setEscolhidos] = useState<Set<string>>(new Set())
  const [copiado, setCopiado] = useState<'convidados' | 'noivos' | null>(null)

  useEffect(() => {
    Promise.all([lerEvento(id), listarMedia(id)])
      .then(async ([e, m]) => {
        setEvento(e)
        setMedia(await assinar(m))
      })
      .catch(() => {})
  }, [id])

  const visiveis = useMemo(() => media.filter((m) => m.status === aba), [media, aba])
  const contar = (s: Aba) => media.filter((m) => m.status === s).length

  if (!evento) return <div className="container-px min-h-[40vh]" />

  const url = absoluteUrl(`e/${evento.slug}`)
  const urlNoivos = `${absoluteUrl(`casamento/${evento.slug}`)}?k=${encodeURIComponent(evento.download_token)}`

  const copiar = (qual: 'convidados' | 'noivos', valor: string) => {
    navigator.clipboard.writeText(valor)
    setCopiado(qual)
    setTimeout(() => setCopiado(null), 1600)
  }

  const alternar = (mid: string) => {
    const s = new Set(escolhidos)
    if (s.has(mid)) s.delete(mid)
    else s.add(mid)
    setEscolhidos(s)
  }

  const aplicar = async (status: MediaAdmin['status']) => {
    const ids = [...escolhidos]
    await mudarEstado(ids, status)
    setMedia((m) => m.map((x) => (escolhidos.has(x.id) ? { ...x, status } : x)))
    setEscolhidos(new Set())
  }

  const remover = async () => {
    const linhas = media.filter((m) => escolhidos.has(m.id))
    if (!confirm(`Apagar ${linhas.length} ficheiro(s) para sempre?`)) return
    await apagarMedia(linhas)
    setMedia((m) => m.filter((x) => !escolhidos.has(x.id)))
    setEscolhidos(new Set())
  }

  const mudar = async (campos: Partial<Evento>) => {
    setEvento({ ...evento, ...campos })
    await guardarEvento(evento.id, campos)
  }

  return (
    <div className="container-px pb-24">
      <Link to="/admin/eventos" className="inline-flex items-center gap-2 label-sm hover:text-titanium/70 transition-colors">
        <ArrowLeft size={12} /> Casamentos
      </Link>

      <h1 className="text-2xl mt-4">{evento.couple_name}</h1>
      <p className="text-titanium/35 text-sm mt-1">
        {new Date(evento.event_date).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}
        {' · '}{gb(evento.bytes_used)} recebidos
        {' · '}{aindaAberto(evento.upload_window_ends_at) ? 'a receber' : 'fechado'}
      </p>

      <div className="grid lg:grid-cols-[auto_1fr] gap-8 lg:gap-12 mt-8 items-start">
        <Codigo url={url} nome={evento.couple_name} />

        <div className="space-y-5 min-w-0">
          {/*
            Dois links, e a diferença entre eles é a coisa mais importante desta
            página: um é para toda a gente e o outro é a chave do casamento. Por
            isso estão separados, com o aviso colado ao segundo, e não numa
            lista de campos onde se copia o errado sem dar por isso.
          */}
          <LinhaDeLink
            etiqueta="Link para os convidados"
            valor={url}
            nota="É este que vai no código QR e nas mesas."
            copiado={copiado === 'convidados'}
            aoCopiar={() => copiar('convidados', url)}
          />

          <LinhaDeLink
            etiqueta="Link dos noivos"
            valor={urlNoivos}
            nota="Abre o painel deles: ver, escolher, esconder e descarregar tudo. Leva a chave do casamento, por isso é só para eles."
            copiado={copiado === 'noivos'}
            aoCopiar={() => copiar('noivos', urlNoivos)}
            destaque
          />

          <Interruptor
            ligado={evento.guests_see_gallery}
            aoMudar={(v) => mudar({ guests_see_gallery: v })}
            titulo="Os convidados veem a galeria"
            nota="Desligado, cada um vê só o que carregou."
          />
          <Interruptor
            ligado={evento.moderation}
            aoMudar={(v) => mudar({ moderation: v })}
            titulo="Aprovar antes de aparecer"
            nota="O que entrar a partir de agora fica à espera. O que já entrou não muda."
          />

          <div>
            <span className="label-sm">Os envios fecham a</span>
            <input
              type="date"
              value={evento.upload_window_ends_at.slice(0, 10)}
              onChange={(e) => mudar({ upload_window_ends_at: new Date(`${e.target.value}T23:59:59`).toISOString() })}
              className="w-full mt-2 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-titanium/85 focus:border-white/30 outline-none transition-colors"
            />
            {/*
              Fechar a janela não apaga nada, e é isso que a nota diz. A
              promessa aos noivos é que as fotografias não desaparecem sozinhas:
              deixam de entrar novas, e o que lá está continua lá.
            */}
            <p className="text-xs text-titanium/35 mt-2 leading-relaxed">
              Depois desta data deixam de entrar fotografias novas. Nada é
              apagado: o que já lá está continua lá até alguém o apagar.
            </p>
          </div>

          <Entrega evento={evento} total={media.length} />
        </div>
      </div>

      <nav className="flex gap-1 border-b border-white/[0.08] mt-12">
        {([
          ['aprovado', 'Na galeria'],
          ['pendente', 'À espera'],
          ['escondido', 'Escondidas'],
        ] as const).map(([chave, etiqueta]) => (
          <button
            key={chave}
            onClick={() => { setAba(chave); setEscolhidos(new Set()) }}
            className={`px-4 py-3 text-[11px] uppercase tracking-[0.18em] border-b-2 -mb-px transition-colors ${
              aba === chave ? 'border-titanium text-titanium' : 'border-transparent text-titanium/40 hover:text-titanium/70'
            }`}
          >
            {etiqueta} <span className="text-titanium/30">{contar(chave)}</span>
          </button>
        ))}
      </nav>

      {escolhidos.size > 0 && (
        <div className="sticky top-4 z-10 mt-4 flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl bg-eerie border border-white/15">
          <span className="text-sm text-titanium/70 mr-auto">{escolhidos.size} escolhidas</span>
          {aba !== 'aprovado' && <Accao aoClicar={() => aplicar('aprovado')} icone={<Check size={13} />}>Pôr na galeria</Accao>}
          {aba !== 'escondido' && <Accao aoClicar={() => aplicar('escondido')} icone={<EyeOff size={13} />}>Esconder</Accao>}
          <Accao aoClicar={remover} icone={<Trash2 size={13} />}>Apagar</Accao>
        </div>
      )}

      {visiveis.length === 0 ? (
        <p className="text-titanium/35 text-sm mt-8">Nada aqui.</p>
      ) : (
        <>
          <button
            onClick={() => setEscolhidos(new Set(escolhidos.size === visiveis.length ? [] : visiveis.map((m) => m.id)))}
            className="mt-5 text-xs text-titanium/45 hover:text-titanium/80 transition-colors"
          >
            {escolhidos.size === visiveis.length ? 'Nenhuma' : 'Escolher todas'}
          </button>

          <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-1.5">
            {visiveis.map((m) => (
              <button
                key={m.id}
                onClick={() => alternar(m.id)}
                className={`relative aspect-square rounded-md overflow-hidden bg-white/[0.04] transition-all ${
                  escolhidos.has(m.id) ? 'ring-2 ring-titanium' : 'hover:opacity-80'
                }`}
              >
                {m.kind === 'video' ? (
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-widest text-titanium/40">
                    Vídeo
                  </span>
                ) : (
                  <img src={m.thumbUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                )}
                {m.uploaded_by_name && (
                  <span className="absolute bottom-0 inset-x-0 px-1.5 py-1 text-[10px] truncate bg-gradient-to-t from-black/70 to-transparent text-titanium/80">
                    {m.uploaded_by_name}
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      <ApagarEvento
        nome={evento.couple_name}
        total={media.length}
        aoApagar={async () => {
          await apagarEvento(evento.id)
          navigate('/admin/eventos')
        }}
      />
    </div>
  )
}

function Accao({ aoClicar, icone, children }: { aoClicar: () => void; icone: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={aoClicar}
      className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/[0.06] hover:bg-white/12 transition-colors text-xs text-titanium/75"
    >
      {icone} {children}
    </button>
  )
}

/**
 * O código QR, desenhado no browser e pronto a imprimir.
 *
 * É gerado aqui e não guardado em lado nenhum, porque não há nada para
 * guardar: o código é só o endereço, e o endereço já está na base de dados.
 * Guardar uma imagem dele era arranjar uma segunda cópia da mesma verdade,
 * para ficar desactualizada no dia em que o slug mudasse.
 */
function Codigo({ url, nome }: { url: string; nome: string }) {
  const canvas = useRef<HTMLCanvasElement | null>(null)
  const guardar = useCallback((c: HTMLCanvasElement) => { canvas.current = c }, [])

  return (
    <div className="w-fit">
      <div className="rounded-xl bg-white p-2">
        <QrNebula url={url} tamanho={800} aoDesenhar={guardar} className="w-40 h-40 sm:w-48 sm:h-48 block" />
      </div>
      <button
        onClick={() => canvas.current && guardarQr(canvas.current, `codigo-${nome}`)}
        className="mt-3 flex items-center gap-1.5 text-xs text-titanium/45 hover:text-titanium/80 transition-colors"
      >
        <Download size={12} /> Guardar o código
      </button>
    </div>
  )
}

/**
 * O botão que entrega tudo.
 *
 * É um link normal e não um pedido em JavaScript, de propósito: o ZIP é
 * construído em stream do outro lado e pode ter duzentos gigabytes. Deixado ao
 * browser, ele grava para o disco à medida que recebe; passado por JavaScript,
 * teria de caber em memória primeiro, e não cabe.
 */
function Entrega({ evento, total }: { evento: Evento; total: number }) {
  if (!ZIP) {
    return (
      <p className="text-xs text-titanium/35 leading-relaxed">
        Falta configurar o VITE_ZIP_WORKER_URL para o download em bloco ficar
        disponível. Ver o README.
      </p>
    )
  }
  return (
    <div>
      <a
        href={`${ZIP}?e=${encodeURIComponent(evento.slug)}&t=${encodeURIComponent(evento.download_token)}`}
        className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-titanium text-eerie text-[11px] uppercase tracking-[0.12em] hover:bg-titanium/90 transition-colors min-h-[44px]"
      >
        <Download size={14} /> Descarregar tudo
      </a>
      <p className="text-xs text-titanium/35 mt-2 leading-relaxed">
        {total} ficheiros, {gb(evento.bytes_used)}. Começa a descarregar logo e
        vai crescendo: num casamento grande demora, mas não pára. Este link leva
        a chave do casamento: só se dá aos noivos.
      </p>
    </div>
  )
}

function LinhaDeLink({
  etiqueta, valor, nota, copiado, aoCopiar, destaque,
}: {
  etiqueta: string
  valor: string
  nota: string
  copiado: boolean
  aoCopiar: () => void
  destaque?: boolean
}) {
  return (
    <div>
      <span className="label-sm">{etiqueta}</span>
      <div className="flex gap-2 mt-2">
        <input
          readOnly
          value={valor}
          onFocus={(e) => e.currentTarget.select()}
          className={`flex-1 min-w-0 bg-white/[0.04] border rounded-lg px-3 py-2.5 text-sm text-titanium/60 ${
            destaque ? 'border-amber-300/25' : 'border-white/10'
          }`}
        />
        <button
          onClick={aoCopiar}
          className="px-4 rounded-lg bg-white/[0.06] hover:bg-white/10 transition-colors text-titanium/70"
          aria-label={`Copiar ${etiqueta.toLowerCase()}`}
        >
          {copiado ? <Check size={15} /> : <Copy size={15} />}
        </button>
      </div>
      <p className={`text-xs mt-2 leading-relaxed ${destaque ? 'text-amber-100/50' : 'text-titanium/35'}`}>
        {nota}
      </p>
    </div>
  )
}


/**
 * Apagar um casamento inteiro.
 *
 * Pede o nome do casal escrito à mão. Não é para tornar a coisa chata: é a
 * única forma de garantir que quem carregou aqui sabia em que casamento estava.
 * Um `confirm()` a seguir a um clique errado é respondido com "sim" sem se ler,
 * e do outro lado estão as fotografias de um dia que não se repete.
 */
function ApagarEvento({
  nome, total, aoApagar,
}: { nome: string; total: number; aoApagar: () => Promise<void> }) {
  const [aberto, setAberto] = useState(false)
  const [escrito, setEscrito] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const bate = escrito.trim().toLowerCase() === nome.trim().toLowerCase()

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="mt-16 block text-xs text-titanium/30 hover:text-titanium/60 transition-colors"
      >
        Apagar este evento
      </button>
    )
  }

  return (
    <div className="mt-16 p-5 rounded-xl border border-red-400/25 bg-red-500/[0.05] max-w-md">
      <p className="text-sm text-titanium/80 leading-relaxed">
        Isto apaga {total} {total === 1 ? 'ficheiro' : 'ficheiros'} do
        armazenamento e todos os registos deste casamento. Não há cópia, não há
        lixo, não há volta.
      </p>
      <p className="text-xs text-titanium/45 mt-3 leading-relaxed">
        Escreve <strong className="text-titanium/75 font-normal">{nome}</strong> para confirmar.
      </p>
      <input
        value={escrito}
        onChange={(e) => setEscrito(e.target.value)}
        autoFocus
        className="w-full mt-3 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-titanium/85 focus:border-white/30 outline-none transition-colors"
      />
      <div className="flex gap-2 mt-4">
        <button
          disabled={!bate || ocupado}
          onClick={async () => {
            setOcupado(true)
            try { await aoApagar() } finally { setOcupado(false) }
          }}
          className="px-4 py-2.5 rounded-full bg-red-500/20 text-red-100 text-[11px] uppercase tracking-[0.12em] disabled:opacity-25 disabled:cursor-not-allowed min-h-[44px]"
        >
          {ocupado ? 'A apagar...' : 'Apagar para sempre'}
        </button>
        <button
          onClick={() => { setAberto(false); setEscrito('') }}
          className="px-4 py-2.5 text-[11px] uppercase tracking-[0.12em] text-titanium/40 hover:text-titanium/70 transition-colors min-h-[44px]"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
