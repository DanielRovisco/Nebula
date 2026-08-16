import { asset } from './asset'

// Larguras geradas por scripts/optimize-images.mjs.
const WIDTHS = [480, 960, 1440] as const

interface PictureProps {
  /** Slug do ficheiro em public/brand/portfolio/, sem extensão nem sufixo. */
  name: string
  alt: string
  /** Atributo `sizes` — quanto do viewport a imagem ocupa neste contexto. */
  sizes: string
  className?: string
  style?: React.CSSProperties
  /**
   * Só para a imagem do LCP (hero). Carrega com prioridade alta e sem lazy,
   * para o browser não a deixar atrás do resto. Máximo uma por página.
   */
  priority?: boolean
}

/**
 * Imagem responsiva: WebP em três larguras via srcset, com JPEG de fallback
 * para browsers sem suporte a WebP.
 */
export default function Picture({
  name,
  alt,
  sizes,
  className,
  style,
  priority = false,
}: PictureProps) {
  const srcset = (ext: string) =>
    WIDTHS.map((w) => `${asset(`/brand/portfolio/${name}-${w}.${ext}`)} ${w}w`).join(', ')

  return (
    // `contents` mantém o <picture> fora do layout: o <img> continua a
    // dimensionar-se contra o contentor real (h-full/absolute inset-0).
    <picture className="contents">
      {/* A ordem é a preferência: o browser fica pelo primeiro que souber ler. */}
      <source type="image/avif" srcSet={srcset('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcset('webp')} sizes={sizes} />
      <img
        src={asset(`/brand/portfolio/${name}.jpg`)}
        alt={alt}
        sizes={sizes}
        className={className}
        style={style}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding={priority ? 'sync' : 'async'}
      />
    </picture>
  )
}

/** srcSet/sizes do hero, partilhado com o `<link rel="preload">` do index.html. */
export const HERO_NAME = 'hero-beach-dress'
