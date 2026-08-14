import type { CoverFont, LogoVariant } from './types'
import { asset } from '../asset'

/**
 * Tipos de letra da capa. São os três que o site já carrega — nenhum download
 * extra, e todos coerentes com a marca.
 */
export const COVER_FONTS: Record<CoverFont, { label: string; className: string }> = {
  serif: {
    label: 'Serifada itálica',
    className: 'font-serif italic font-normal tracking-normal',
  },
  sans: {
    label: 'Sem serifa',
    className: 'font-semibold tracking-tight',
  },
  label: {
    label: 'Maiúsculas espaçadas',
    className: 'uppercase font-normal tracking-[0.22em]',
  },
}

export const LOGO_VARIANTS: Record<LogoVariant, { label: string; src: string | null }> = {
  white: { label: 'Logo branco', src: asset('/brand/logo-mix-white.png') },
  black: { label: 'Logo preto', src: asset('/brand/logo-mix-black.png') },
  none: { label: 'Sem logo', src: null },
}

/** Tamanhos por tipo de letra: as maiúsculas espaçadas pedem menos corpo. */
export const coverFontSize = (font: CoverFont) =>
  font === 'label' ? 'clamp(1.1rem, 3vw, 2.2rem)' : 'clamp(2.2rem, 7vw, 5.5rem)'
