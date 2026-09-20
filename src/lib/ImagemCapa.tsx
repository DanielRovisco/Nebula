import { publicUrl } from './site-content/public'
import type { ServiceCover } from './site-content/types'

/**
 * Uma fotografia carregada pelo painel, servida no tamanho que cada ecrã pede.
 *
 * Existe por causa da fotografia de entrada. Ela ocupa o ecrã todo e é
 * descarregada por toda a gente que abre o site, e durante muito tempo teve um
 * ficheiro só: primeiro 1600 pixels, o que a deixava esticada num portátil de
 * retina, e depois 2400, o que passou a obrigar um telemóvel a descarregar o
 * ficheiro do portátil. Não há número que sirva os dois — o que faltava era
 * haver dois números.
 *
 * O intermédio tem metade da largura do grande (ver `uploadSitePhoto`), e é daí
 * que sai o descritor: sabendo a largura do grande, sabe-se a do outro. As
 * capas carregadas antes disto existir não têm intermédio nem largura guardada,
 * e nesse caso serve-se a grande sozinha, que é exactamente o que já acontecia.
 */
export default function ImagemCapa({
  capa,
  alt,
  sizes,
  className,
  prioridade = false,
}: {
  capa: ServiceCover
  alt: string
  /** Quanto do ecrã a fotografia ocupa aqui. Sem isto o browser assume 100vw. */
  sizes: string
  className?: string
  /** Só para a fotografia de entrada: é o elemento que mede a velocidade da página. */
  prioridade?: boolean
}) {
  const grande = publicUrl(capa.storageKey)
  const temDois = Boolean(capa.mediumKey && capa.width)

  return (
    <img
      src={grande}
      srcSet={
        temDois
          ? `${publicUrl(capa.mediumKey!)} ${Math.round(capa.width! / 2)}w, ${grande} ${capa.width}w`
          : undefined
      }
      sizes={temDois ? sizes : undefined}
      alt={alt}
      width={capa.width ?? undefined}
      height={capa.height ?? undefined}
      /*
        A de entrada carrega com prioridade e sem preguiça; as outras ao
        contrário. Uma página só pode ter uma assim, senão nenhuma é prioritária.
      */
      fetchPriority={prioridade ? 'high' : 'auto'}
      loading={prioridade ? 'eager' : 'lazy'}
      decoding={prioridade ? 'sync' : 'async'}
      style={{ objectPosition: capa.pos }}
      className={className}
    />
  )
}
