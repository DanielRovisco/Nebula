/**
 * Fotografia de cada serviço, a que vem no repositório.
 *
 * Vive aqui, e não dentro de cada página, porque é usada em dois sítios: nos
 * cartões da página inicial e no painel da página de serviços. Estava escrita
 * nas duas, e o resultado foi o previsível — a Maternidade tinha uma
 * fotografia na home e outra nos serviços, e ninguém deu por isso durante
 * semanas.
 *
 * Isto é o ponto de partida. Uma capa carregada no painel substitui-a nos dois
 * sítios ao mesmo tempo (ver site_service_covers e useServiceCovers).
 */
export interface CapaLocal {
  /** Nome do ficheiro em public/brand/portfolio, sem tamanho nem extensão. */
  image: string
  alt: string
  /** Recorte, como classe do Tailwind. A grelha corta, e o que interessa raramente está ao centro. */
  imgPos: string
}

export const CAPAS_LOCAIS: Record<string, CapaLocal> = {
  casamentos: {
    image: 'forest-bride',
    alt: 'Sessão editorial em vestido longo branco, entre árvores',
    imgPos: 'object-top',
  },
  maternidade: {
    image: 'maternity-sunset-couple',
    alt: 'Casal à espera de bebé, ao pôr do sol',
    /*
      Centrada, e não afinada na vertical: a fotografia é mais larga que o
      cartão em proporção, por isso o recorte come pelos lados e um
      `object-[50%_65%]` não mexeria um pixel. O casal está ao centro, que é o
      que interessa.
    */
    imgPos: 'object-center',
  },
  retratos: {
    image: 'editorial-dramatic',
    alt: 'Retrato editorial com iluminação dramática',
    imgPos: 'object-[50%_20%]',
  },
  eventos: {
    image: 'baby-balloons',
    alt: 'Retrato de bebé rodeado de balões',
    imgPos: 'object-[50%_72%]',
  },
}
