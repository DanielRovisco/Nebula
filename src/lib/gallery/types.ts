export interface Gallery {
  id: string
  slug: string
  title: string
  clientName: string | null
  message: string | null
  coverPath: string | null
  published: boolean
  downloadEnabled: boolean
  expiresAt: string | null
  createdAt: string
  photoCount?: number
}

export interface Photo {
  id: string
  galleryId: string
  storagePath: string
  thumbPath: string | null
  fileName: string
  width: number | null
  height: number | null
  sizeBytes: number | null
  sortOrder: number
}

/** Uma foto tal como o cliente a recebe: já com signed URLs temporários. */
export interface SignedPhoto {
  id: string
  fileName: string
  width: number | null
  height: number | null
  sizeBytes: number | null
  url: string | null
  thumbUrl: string | null
}

export interface GalleryAccess {
  gallery: {
    id: string
    slug: string
    title: string
    clientName: string | null
    message: string | null
    downloadEnabled: boolean
  }
  photos: SignedPhoto[]
  /** Segundos de validade dos URLs assinados, a contar da resposta. */
  expiresIn: number
}

export type NewGallery = {
  slug: string
  title: string
  clientName?: string
  message?: string
  password: string
  published?: boolean
  downloadEnabled?: boolean
  expiresAt?: string | null
}

export type GalleryPatch = Partial<Omit<NewGallery, 'password'>> & { password?: string }
