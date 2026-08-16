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
