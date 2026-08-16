/**
 * Eventos de conversão.
 *
 * Saber quantas pessoas visitam o site vale pouco; saber quantas chegam ao
 * botão de marcar sessão e não carregam vale muito. Isto marca os momentos que
 * interessam — abrir o formulário, enviá-lo, ir para o Instagram.
 *
 * Sem ferramenta de estatísticas configurada não acontece nada: as duas APIs
 * abaixo simplesmente não existem no `window` e a função sai em silêncio. Não é
 * recolhido nada por nós, nem é guardado nada no dispositivo — continua a ser
 * contagem agregada e anónima, sem cookies.
 */
type ComPlausible = Window & {
  plausible?: (evento: string, opcoes?: { props?: Record<string, string> }) => void
  umami?: { track?: (evento: string, dados?: Record<string, string>) => void }
}

export type TrackEvent =
  | 'cta_marcar_sessao'
  | 'cta_instagram'
  | 'formulario_enviado'
  | 'formulario_email'
  | 'galeria_entrou'

export function track(evento: TrackEvent, props?: Record<string, string>) {
  if (typeof window === 'undefined') return
  const w = window as ComPlausible
  try {
    w.plausible?.(evento, props ? { props } : undefined)
    w.umami?.track?.(evento, props)
  } catch {
    // Medir nunca pode partir o que está a ser medido.
  }
}
