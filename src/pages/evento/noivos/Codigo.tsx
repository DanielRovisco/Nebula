import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, Download, Maximize2, X } from 'lucide-react'
import QrNebula from '../../../components/QrNebula'
import { guardarQr } from '../../../lib/qr/guardar'

/**
 * O código QR do casamento, no painel dos noivos.
 *
 * Existem três coisas que eles vão querer fazer com ele, e as três estão aqui:
 * mostrá-lo a alguém que está à frente deles (o ecrã cheio), imprimi-lo (a
 * imagem grande) e mandá-lo por mensagem (o link). Um casal que tenha de pedir
 * o código ao fotógrafo no dia do casamento é um casal a quem se entregou meia
 * ferramenta.
 */
export default function Codigo({ url, nome }: { url: string; nome: string }) {
  const [ampliado, setAmpliado] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const canvas = useRef<HTMLCanvasElement | null>(null)

  const guardar = useCallback((c: HTMLCanvasElement) => { canvas.current = c }, [])

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1800)
    } catch { /* sem permissão: o link está à vista para copiar à mão */ }
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-7 sm:gap-9 items-start">
        <button
          onClick={() => setAmpliado(true)}
          className="group relative shrink-0 rounded-2xl bg-white p-3 sm:p-4 transition-transform duration-500 hover:scale-[1.02] focus-visible:scale-[1.02]"
          aria-label="Ver o código em grande"
        >
          <QrNebula url={url} tamanho={640} aoDesenhar={guardar} className="w-36 h-36 sm:w-44 sm:h-44 block" />
          <span className="absolute inset-0 rounded-2xl flex items-center justify-center bg-eerie/0 group-hover:bg-eerie/45 group-focus-visible:bg-eerie/45 transition-colors duration-300">
            <Maximize2
              size={20}
              className="text-titanium opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300"
            />
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-2xl sm:text-3xl leading-tight">O vosso código</h2>
          <p className="text-titanium/50 text-sm leading-relaxed mt-2.5 max-w-sm">
            Quem o ler cai numa página onde pode deixar fotografias, sem criar
            conta nenhuma. Imprimam-no e ponham-no nas mesas.
          </p>

          <div className="flex flex-wrap gap-2 mt-5">
            <Botao aoClicar={() => setAmpliado(true)} icone={<Maximize2 size={13} />}>
              Ver em grande
            </Botao>
            <Botao
              aoClicar={() => canvas.current && guardarQr(canvas.current, `codigo-${nome}`)}
              icone={<Download size={13} />}
            >
              Guardar imagem
            </Botao>
            <Botao aoClicar={copiar} icone={copiado ? <Check size={13} /> : <Copy size={13} />}>
              {copiado ? 'Copiado' : 'Copiar link'}
            </Botao>
          </div>

          <p className="mt-4 text-xs text-titanium/30 break-all">{url}</p>
        </div>
      </div>

      {ampliado && <EcraCheio url={url} nome={nome} aoFechar={() => setAmpliado(false)} />}
    </>
  )
}

function Botao({
  aoClicar, icone, children,
}: { aoClicar: () => void; icone: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={aoClicar}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/12 text-[11px] uppercase tracking-[0.12em] text-titanium/60 hover:border-white/35 hover:text-titanium/90 transition-all min-h-[44px]"
    >
      {icone} {children}
    </button>
  )
}

/**
 * O código a ocupar o ecrã todo, para alguém o ler do outro lado da mesa.
 *
 * Sobre fundo claro e não escuro: é o fundo que o código precisa para ser lido,
 * e um telemóvel apontado a um ecrã escuro com um código invertido falha em
 * muitos leitores. Aqui o desenho segue a máquina, não o contrário.
 */
function EcraCheio({ url, nome, aoFechar }: { url: string; nome: string; aoFechar: () => void }) {
  const canvas = useRef<HTMLCanvasElement | null>(null)
  const guardar = useCallback((c: HTMLCanvasElement) => { canvas.current = c }, [])

  useEffect(() => {
    const aoTeclado = (e: KeyboardEvent) => { if (e.key === 'Escape') aoFechar() }
    document.addEventListener('keydown', aoTeclado)

    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    /*
      O ecrã não adormece enquanto o código está à vista. Um telemóvel pousado
      numa mesa com o código aberto apaga-se ao fim de trinta segundos, e o
      convidado seguinte encontra um ecrã preto. Nem todos os browsers têm
      isto, e onde não houver o comportamento é o de sempre.
    */
    let travao: { release: () => Promise<void> } | null = null
    const wake = (navigator as Navigator & {
      wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> }
    }).wakeLock
    wake?.request('screen').then((t) => { travao = t }).catch(() => {})

    return () => {
      document.removeEventListener('keydown', aoTeclado)
      document.body.style.overflow = antes
      travao?.release().catch(() => {})
    }
  }, [aoFechar])

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-[#f7f7f4] flex flex-col items-center justify-center p-6">
      <button
        onClick={aoFechar}
        aria-label="Fechar"
        className="absolute top-5 right-5 w-11 h-11 rounded-full flex items-center justify-center text-eerie/45 hover:text-eerie hover:bg-eerie/[0.06] transition-colors"
      >
        <X size={22} />
      </button>

      <p className="text-eerie/45 text-[0.65rem] uppercase tracking-[0.28em] mb-7 text-center">
        Aponta a câmara
      </p>

      <QrNebula
        url={url}
        tamanho={1400}
        aoDesenhar={guardar}
        className="w-[min(78vw,60vh,520px)] h-[min(78vw,60vh,520px)] block"
      />

      <p className="mt-8 font-serif text-2xl sm:text-3xl text-eerie text-center">{nome}</p>

      <button
        onClick={() => canvas.current && guardarQr(canvas.current, `codigo-${nome}`)}
        className="mt-7 inline-flex items-center gap-2 px-5 py-3 rounded-full border border-eerie/15 text-[11px] uppercase tracking-[0.12em] text-eerie/60 hover:border-eerie/40 hover:text-eerie transition-all min-h-[44px]"
      >
        <Download size={13} /> Guardar para imprimir
      </button>
    </div>,
    document.body,
  )
}
