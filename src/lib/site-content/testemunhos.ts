import type { Testimonial } from './types'

/**
 * Testemunhos reais, escritos por clientes e publicados por eles próprios nas
 * suas redes. Vivem no código até serem passados para o painel — a partir daí
 * o painel manda e isto deixa de ser usado.
 *
 * A regra continua a ser a mesma que estava aqui antes: nada de elogios
 * escritos por nós. O que mudou é que agora há elogios verdadeiros. Os textos
 * estão encurtados para caberem num cartão, mas são palavra por palavra as
 * de quem os escreveu — nada foi reformulado, nada foi melhorado.
 */
export const TESTEMUNHOS: Testimonial[] = [
  {
    id: 'carolina-vital',
    author: 'Carolina Vital',
    context: 'Revelação do sexo, maternidade e recém-nascido',
    quote:
      'Costuma-se dizer que a fotografia regista momentos, mas o que eles fazem é eternizar o amor. Acompanharam o capítulo mais importante da minha vida: desde a ansiedade da revelação do sexo, passando por cada curva da minha gravidez, até aos sorrisos da minha filha hoje. Não estão apenas a contratar fotógrafos, estão a confiar as vossas memórias a quem realmente sabe o valor de um momento.',
    sortOrder: 0,
    published: true,
  },
  {
    id: 'andreia-elton',
    author: 'Andreia e Elton',
    context: 'Vídeo de revelação do sexo',
    quote:
      'Queremos agradecer de coração à Nebula pelo vídeo incrível de revelação do sexo dos nossos bebés. Foi um momento mágico, emocionante e inesquecível para nós e para toda a nossa família. O carinho, dedicação e profissionalismo ficaram visíveis em cada detalhe. Recomendamos a Nebula de olhos fechados!',
    sortOrder: 1,
    published: true,
  },
  {
    /*
      Por publicar por uma razão só: falta o nome de quem o escreveu.
      Um elogio sem assinatura lê-se como inventado, e o preço não é ficar
      um cartão a menos — é lançar a dúvida sobre os outros dois, que são
      verdadeiros e têm nome. Basta pôr o nome aqui e `published: true`.
    */
    id: 'sessao-editorial',
    author: '',
    context: 'Sessão editorial',
    quote:
      'Gostei imenso de estar convosco. Sendo sincera, não estava à espera de me sentir tão confortável como senti. Gostei muito da vossa vibe, e sem dúvida que quero voltar a repetir.',
    sortOrder: 2,
    published: false,
  },
]
