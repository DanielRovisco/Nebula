import { useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { en } from './en'
import { pt, type Dict } from './pt'
import { langFromPath, path, type Lang, type RouteKey } from './routes'

const DICTS: Record<Lang, Dict> = { pt, en }

/**
 * A língua vem do endereço, não de um estado guardado.
 *
 * É o que faz um link partilhado abrir na língua em que foi partilhado, e o que
 * permite ao Google indexar as duas versões como páginas diferentes. Um seletor
 * que só mudasse estado em memória dava um site inglês que ninguém consegue
 * ligar a ninguém.
 */
export function useLang(): Lang {
  return langFromPath(useLocation().pathname)
}

/** Os textos da língua atual. */
export function useT(): Dict {
  return DICTS[useLang()]
}

/** Endereço de uma página na língua atual: `to(link('about'))`. */
export function useLink() {
  const lang = useLang()
  return useCallback((key: RouteKey) => path(key, lang), [lang])
}

export { LANGS, ROUTES, GALLERY_VIEW, langFromPath, path, switchLang } from './routes'
export type { Lang, RouteKey } from './routes'
export type { Dict } from './pt'
