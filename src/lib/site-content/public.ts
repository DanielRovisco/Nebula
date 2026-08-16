import type { SiteCategory, SitePhoto } from './types'

/**
 * Leitura do conteúdo público do site.
 *
 * Fala com o PostgREST do Supabase por `fetch` simples, de propósito: importar
 * o SDK aqui arrastava 215 kB de JavaScript para dentro da página de portfólio,
 * que é uma página de marketing onde cada quilobyte conta. O SDK fica reservado
 * ao painel.
 */

const URL_ = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '')
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const PUBLIC_BASE = (import.meta.env.VITE_R2_PUBLIC_URL as string | undefined)?.replace(/\/$/, '')
const DEMO = import.meta.env.VITE_DEMO_GALLERIES === 'true'

export const publicUrl = (key: string) => (PUBLIC_BASE ? `${PUBLIC_BASE}/${key}` : '')

async function rest<T>(path: string): Promise<T | null> {
  if (!URL_ || !ANON) return null
  try {
    const res = await fetch(`${URL_}/rest/v1/${path}`, {
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

/**
 * Devolve `null` quando não há nada configurado, não há fotos carregadas, ou a
 * leitura falha — quem chama trata isso como "usa o conteúdo do código". É o
 * que impede o portfólio de aparecer vazio se o Supabase estiver a dormir.
 */
export async function fetchPortfolio(): Promise<{
  categories: SiteCategory[]
  photos: SitePhoto[]
} | null> {
  if (DEMO || !PUBLIC_BASE) return null

  const [cats, pics] = await Promise.all([
    rest<Record<string, unknown>[]>('site_categories?select=*&order=sort_order'),
    rest<Record<string, unknown>[]>('site_photos?select=*&published=eq.true&order=sort_order'),
  ])
  if (!cats || !pics || pics.length === 0) return null

  return {
    categories: cats.map((r) => ({
      id: r.id as string,
      slug: r.slug as string,
      label: r.label as string,
      sortOrder: (r.sort_order as number) ?? 0,
    })),
    photos: pics.map((r) => ({
      id: r.id as string,
      categoryId: (r.category_id as string) ?? null,
      storageKey: r.storage_key as string,
      thumbKey: (r.thumb_key as string) ?? null,
      alt: (r.alt as string) ?? '',
      width: (r.width as number) ?? null,
      height: (r.height as number) ?? null,
      tall: Boolean(r.tall),
      sortOrder: (r.sort_order as number) ?? 0,
      published: true,
    })),
  }
}
