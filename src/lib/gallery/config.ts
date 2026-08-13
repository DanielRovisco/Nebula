import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * Modo de demonstração: galerias falsas em memória, para mostrar e aprovar o
 * desenho sem Supabase configurado.
 *
 * Tem de ser LIGADO EXPLICITAMENTE. Nunca é um fallback automático de "faltam
 * as variáveis" — se fosse, um deploy sem configuração passaria a servir um
 * cadeado decorativo com ar de verdadeiro, que é exatamente o que não queremos
 * num site que guarda fotografias privadas de clientes.
 */
export const DEMO = import.meta.env.VITE_DEMO_GALLERIES === 'true'

export const CONFIGURED = Boolean(URL && ANON)

let client: SupabaseClient | null = null

export function supabase(): SupabaseClient {
  if (!CONFIGURED) {
    throw new Error(
      'Supabase não está configurado. Define VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
    )
  }
  if (!client) {
    client = createClient(URL!, ANON!, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  }
  return client
}

export const functionsUrl = (name: string) => `${URL}/functions/v1/${name}`
export const anonKey = () => ANON!
