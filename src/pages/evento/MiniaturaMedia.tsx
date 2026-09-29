import { Play } from 'lucide-react'

/**
 * O quadrado de uma fotografia ou de um vídeo na grelha.
 *
 * Estava aqui uma `<img>` apontada ao ficheiro de vídeo. Um browser não desenha
 * um MP4 numa `<img>`: o que aparecia era o ícone de imagem partida com o texto
 * alternativo esparramado por cima — e, pior, o vídeo inteiro era descarregado
 * para ser deitado fora.
 *
 * A tentação era trocá-la por um `<video preload="metadata">` com `#t=0.1`, que
 * desenha mesmo o primeiro fotograma. Medido com dois vídeos de 33 MB: para
 * mostrar um fotograma de cada, o browser puxou 40 MB dos 68 MB. Numa rede de
 * quinta, uma grelha com vinte vídeos são centenas de megabytes para mostrar
 * vinte quadradinhos.
 *
 * Por isso o vídeo sem miniatura não puxa nada: fica um quadrado com o símbolo
 * de reprodução, que é honesto e custa zero. A miniatura a sério é feita uma
 * vez — no telemóvel de quem envia, ou pelo painel dos noivos para os vídeos
 * que já lá estavam — e a partir daí é uma imagem de 40 kB como as outras.
 */
export default function MiniaturaMedia({
  kind, url, thumbUrl, alt, className = '',
}: {
  kind: 'foto' | 'video'
  url: string
  thumbUrl: string | null | undefined
  alt: string
  className?: string
}) {
  if (kind === 'video' && !thumbUrl) {
    return (
      <span
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-white/[0.05] text-titanium/30 ${className}`}
      >
        <Play size={26} />
      </span>
    )
  }
  return <img src={thumbUrl ?? url} alt={alt} loading="lazy" className={className} />
}
