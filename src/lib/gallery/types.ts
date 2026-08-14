export type CoverFont = 'serif' | 'sans' | 'label'
export type LogoVariant = 'white' | 'black' | 'none'

export interface Gallery {
  id: string
  slug: string
  title: string
  clientName: string | null
  message: string | null
  coverPath: string | null
  /** Foto da galeria usada como capa. */
  coverPhotoId: string | null
  /** Texto centrado sobre a capa. Vazio = usa o título. */
  coverTitle: string | null
  coverFont: CoverFont
  logoVariant: LogoVariant
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
  contentType: string | null
  width: number | null
  height: number | null
  sizeBytes: number | null
  sortOrder: number
}

/** Uma foto tal como o cliente a recebe: já com signed URLs temporários. */
export interface SignedPhoto {
  id: string
  fileName: string
  contentType: string | null
  width: number | null
  height: number | null
  sizeBytes: number | null
  url: string | null
  thumbUrl: string | null
}

/** Um item é vídeo se o content type o disser, ou pela extensão em dados antigos. */
export const isVideo = (p: { contentType: string | null; fileName: string }) =>
  p.contentType?.startsWith('video/') ?? /\.(mp4|mov|webm|m4v)$/i.test(p.fileName)

export interface GalleryAccess {
  gallery: {
    id: string
    slug: string
    title: string
    clientName: string | null
    message: string | null
    downloadEnabled: boolean
    coverTitle: string | null
    coverFont: CoverFont
    logoVariant: LogoVariant
    /** URL assinado da foto de capa, quando houver. */
    coverUrl: string | null
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
  coverPhotoId?: string | null
  coverTitle?: string | null
  coverFont?: CoverFont
  logoVariant?: LogoVariant
}

export type GalleryPatch = Partial<Omit<NewGallery, 'password'>> & { password?: string }
