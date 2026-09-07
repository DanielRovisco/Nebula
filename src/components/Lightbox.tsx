import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import Picture from '../lib/Picture'
import { useT } from '../lib/i18n'
import type { PortfolioItem } from '../lib/site-content/useSiteContent'

interface Props {
  item: PortfolioItem
  index: number
  total: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

/**
 * Fotografia em grande, sobre fundo opaco.
 *
 * Opaco e não translúcido de propósito: com transparência via-se o site inteiro
 * por trás da fotografia, e o que devia ser o momento de olhar para uma imagem
 * passava a ser uma imagem em cima de uma grelha de imagens.
 */
export default function Lightbox({ item, index, total, onClose, onPrev, onNext }: Props) {
  const t = useT()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    }
    document.addEventListener('keydown', onKey)

    // Sem isto o fundo continua a rolar por trás da fotografia.
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = antes
    }
  }, [onClose, onPrev, onNext])

  const imagemClasse = 'max-h-[82svh] max-w-[92vw] w-auto h-auto object-contain rounded-lg'

  // Portal para o <body> pela mesma razão da abertura: a transição de rota cria
  // um contexto de empilhamento e o z-index deixava de valer contra a barra.
  return createPortal(
    <div
      className="fixed inset-0 z-[150] bg-eerie flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={item.alt}
    >
      <div className="flex items-center justify-between container-px py-5 shrink-0">
        <span className="label-sm">
          {item.category} · {index + 1}/{total}
        </span>
        <button
          onClick={onClose}
          aria-label={t.portfolio.close}
          className="w-11 h-11 rounded-full border border-white/15 flex items-center justify-center text-titanium/70 hover:text-titanium hover:border-white/40 transition-colors active:scale-95"
        >
          <X size={18} />
        </button>
      </div>

      {/* Clicar fora da fotografia fecha; na fotografia, não. */}
      <div className="flex-1 flex items-center justify-center px-4 pb-4 min-h-0" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} style={{ viewTransitionName: 'foto' }}>
          {item.video ? (
            /*
              `controls` sempre: um vídeo sem barra não se pausa nem se
              rebobina, e obrigar alguém a fechar a janela para o parar é
              mau. Sem `autoPlay` com som — arranca calado e a tocar, que é o
              que os browsers deixam fazer sem gesto do visitante.
            */
            <video
              src={item.src}
              poster={item.thumb || undefined}
              controls
              autoPlay
              muted
              playsInline
              className={imagemClasse}
            />
          ) : item.localName ? (
            <Picture name={item.localName} alt={item.alt} sizes="92vw" className={imagemClasse} />
          ) : (
            <img src={item.src} alt={item.alt} decoding="async" className={imagemClasse} />
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 pb-8 shrink-0">
        <button
          onClick={onPrev}
          aria-label={t.portfolio.prev}
          className="w-12 h-12 rounded-full border border-white/15 flex items-center justify-center text-titanium/70 hover:text-titanium hover:border-white/40 transition-colors active:scale-95"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={onNext}
          aria-label={t.portfolio.next}
          className="w-12 h-12 rounded-full border border-white/15 flex items-center justify-center text-titanium/70 hover:text-titanium hover:border-white/40 transition-colors active:scale-95"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>,
    document.body,
  )
}
