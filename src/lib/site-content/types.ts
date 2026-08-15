export interface SiteCategory {
  id: string
  slug: string
  label: string
  sortOrder: number
}

export interface SitePhoto {
  id: string
  categoryId: string | null
  storageKey: string
  thumbKey: string | null
  alt: string
  width: number | null
  height: number | null
  tall: boolean
  sortOrder: number
  published: boolean
}

/** Números da secção de estatísticas da página inicial. */
export interface StatItem {
  value: string
  label: string
  /** Quando presente, o número conta de 0 até aqui ao entrar no ecrã. */
  countTo?: number
  suffix?: string
}

export interface SiteSettings {
  stats: StatItem[]
  heroNote: string
  manifesto: [string, string]
}

export const DEFAULT_SETTINGS: SiteSettings = {
  stats: [
    { value: '20+', countTo: 20, suffix: '+', label: 'Histórias contadas' },
    { value: '3', label: 'Criadores visuais' },
    { value: '360°', label: 'Foto, vídeo e criação de conteúdo' },
  ],
  heroNote: 'Datas 2026 disponíveis',
  manifesto: ['"Não fotografamos momentos.', 'Eternizamos sentimentos."'],
}
