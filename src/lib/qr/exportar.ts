import { desenharQr } from './desenhar'
import { simbolo } from './simbolo'
import { guardarBlob } from '../guardarFicheiro'

export type CorDoQr = 'preto' | 'branco'

/** Preto sobre claro, ou branco sobre escuro. Nunca com fundo. */
const TINTA: Record<CorDoQr, string> = { preto: '#141414', branco: '#ffffff' }

/**
 * Desenha o código num canvas novo, em tamanho de impressão e sem fundo.
 *
 * O fundo transparente não é um detalhe: um código guardado com um quadrado
 * branco à volta só assenta bem em papel branco, e quem o quer para um convite
 * escuro, uma etiqueta ou um cartaz com fotografia acaba a recortá-lo à mão.
 */
export async function canvasDoQr(
  url: string,
  cor: CorDoQr,
  tamanho = 2000,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  desenharQr(canvas, url, {
    tamanho,
    frente: TINTA[cor],
    // A cor do símbolo acompanha a dos módulos: um símbolo preto num código
    // branco desaparece no fundo escuro onde esse código vai ser posto.
    simbolo: await simbolo(cor),
    fundo: null,
    simboloEscala: 0.22,
    // Sem fundo, a margem deixa de ser branca e passa a ser o que estiver por
    // trás. Mantém-se na mesma: os leitores precisam dela para encontrar o
    // código, e sem ela um cartaz com o código colado à borda não é lido.
    margem: 4,
    densidade: 1,
  })
  return canvas
}

/**
 * Guarda o código como PNG transparente.
 *
 * Pelo mesmo caminho das fotografias, e não por um `<a>` com um `data:` à
 * frente. Quem carrega aqui é sobretudo o casal, no telemóvel, para mandar o
 * código a alguém ou levá-lo a imprimir: em iOS o menu do sistema tem "Guardar
 * imagem" e põe-no nas Fotos, enquanto um `data:` grande ou não descarrega ou
 * vai parar aos Ficheiros.
 */
export async function guardarQr(url: string, cor: CorDoQr, nome: string) {
  const canvas = await canvasDoQr(url, cor)
  // Um nome de ficheiro com barras ou dois pontos é recusado por alguns
  // sistemas, e "Joana & Miguel" tem tudo para dar problemas.
  const limpo = nome.replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-').toLowerCase()
  const ficheiro = `codigo-${limpo || 'nebula'}-${cor}.png`

  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
  if (!blob) return
  await guardarBlob(blob, ficheiro, 'image/png')
}
