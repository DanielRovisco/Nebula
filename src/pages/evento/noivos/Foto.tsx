import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Download, EyeOff, Trash2, Undo2, X } from 'lucide-react'
import type { MediaNoivos } from '../../../lib/evento/noivos'

/**
 * Uma fotografia em grande, com o que se pode fazer com ela à mão.
 *
 * As acções vivem aqui e não só na grelha porque é a olhar para a fotografia
 * em tamanho grande que se decide se ela fica ou não. Obrigar a fechar, voltar
 * à grelha e procurar o quadrado certo era pedir ao casal que tomasse a decisão
 * duas vezes.
 */
interface Props {
  item: MediaNoivos
  indice: number
  total: number
  aoFechar: () => void
  aoAnterior: () => void
  aoSeguinte: () => void
  aoEsconder: () => void
  aoApagar: () => void
  /** No lixo as duas acções trocam de sentido: recuperar, ou apagar de vez. */
  noLixo?: boolean
}

export default function Foto({
  item, indice, total, aoFechar, aoAnterior, aoSeguinte, aoEsconder, aoApagar, noLixo,
}: Props) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar()
      if (e.key === 'ArrowLeft') aoAnterior()
      if (e.key === 'ArrowRight') aoSeguinte()
    }
    document.addEventListener('keydown', tecla)
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', tecla)
      document.body.style.overflow = antes
    }
  }, [aoFechar, aoAnterior, aoSeguinte])

  const quando = item.takenAt ?? item.createdAt

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-eerie flex flex-col">
      <header className="flex items-center gap-3 px-4 sm:px-6 h-16 shrink-0">
        <button onClick={aoFechar} aria-label="Fechar" className={ICONE}>
          <X size={20} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-sm text-titanium/70 truncate">
            {item.autor ? `de ${item.autor}` : 'sem nome'}
          </p>
          <p className="text-[0.65rem] uppercase tracking-[0.2em] text-titanium/30 mt-0.5">
            {indice + 1} de {total}
          </p>
        </div>
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          aria-label="Abrir o ficheiro original"
          className={ICONE}
        >
          <Download size={19} />
        </a>
      </header>

      <div className="flex-1 min-h-0 relative flex items-center justify-center px-2">
        {total > 1 && (
          <button onClick={aoAnterior} aria-label="Anterior" className={`${SETA} left-1 sm:left-4`}>
            <ChevronLeft size={22} />
          </button>
        )}

        {item.kind === 'video' ? (
          <video
            key={item.id}
            src={item.url}
            controls
            autoPlay
            playsInline
            className="max-h-full max-w-full rounded-lg"
          />
        ) : (
          <img
            key={item.id}
            src={item.url}
            alt={item.nome ?? 'Fotografia do casamento'}
            className="max-h-full max-w-full object-contain rounded-lg"
          />
        )}

        {total > 1 && (
          <button onClick={aoSeguinte} aria-label="Seguinte" className={`${SETA} right-1 sm:right-4`}>
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      <footer className="shrink-0 px-4 sm:px-6 py-4 flex items-center justify-center gap-2 flex-wrap">
        <span className="text-xs text-titanium/30 mr-auto hidden sm:block">
          {new Date(quando).toLocaleString('pt-PT', {
            day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
          })}
        </span>
        <button onClick={aoEsconder} className={ACCAO}>
          {noLixo
            ? <><Undo2 size={13} /> Recuperar</>
            : <><EyeOff size={13} /> {item.status === 'escondido' ? 'Voltar a mostrar' : 'Esconder'}</>}
        </button>
        <button
          onClick={aoApagar}
          className={noLixo
            ? 'inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-red-500/15 hover:bg-red-500/25 text-red-200/85 transition-colors text-[11px] uppercase tracking-[0.12em] min-h-[44px]'
            : ACCAO}
        >
          <Trash2 size={13} /> {noLixo ? 'Apagar mesmo' : 'Apagar'}
        </button>
      </footer>
    </div>,
    document.body,
  )
}

const ICONE =
  'w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-titanium/55 hover:text-titanium hover:bg-white/[0.07] transition-colors'

const SETA =
  'absolute top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-titanium/45 hover:text-titanium hover:bg-white/[0.07] transition-colors z-10'

const ACCAO =
  'inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/12 text-[11px] uppercase tracking-[0.12em] text-titanium/55 hover:border-white/35 hover:text-titanium/90 transition-all min-h-[44px]'
