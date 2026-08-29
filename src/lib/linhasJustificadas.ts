/**
 * Distribui fotografias por linhas que preenchem a largura, sem as cortar.
 *
 * É o que o Pixieset e o Google Fotos fazem: em vez de forçar todas ao mesmo
 * quadrado, cada uma fica com a sua forma e a linha estica-se para acabar
 * certa na margem. Uma fotografia deitada ocupa mais espaço do que uma em pé,
 * que é como elas foram tiradas.
 *
 * Linhas e não colunas de propósito. Uma grelha em colunas — o outro desenho
 * habitual — lê-se de cima a baixo em cada coluna, e uma galeria de casamento
 * está por ordem cronológica: em colunas, o fim do dia aparece ao lado do
 * princípio.
 */
export interface Medida {
  id: string
  largura: number
  altura: number
}

export function linhasJustificadas(
  itens: readonly { id: string; width: number | null; height: number | null }[],
  larguraDisponivel: number,
  alturaAlvo: number,
  goteira: number,
): Medida[][] {
  if (larguraDisponivel <= 0 || itens.length === 0) return []

  const linhas: Medida[][] = []
  let atual: { id: string; racio: number }[] = []
  let soma = 0

  const fechar = (esticar: boolean) => {
    if (!atual.length) return
    const util = larguraDisponivel - goteira * (atual.length - 1)
    /*
      A última linha não se estica. Com duas fotografias no fim, esticá-las até
      à margem dava-lhes o dobro da altura das de cima, e o que era o resto da
      grelha passava a parecer o destaque.
    */
    const altura = esticar ? util / soma : Math.min(alturaAlvo, util / soma)
    linhas.push(atual.map((x) => ({ id: x.id, largura: x.racio * altura, altura })))
    atual = []
    soma = 0
  }

  for (const item of itens) {
    // Sem dimensões conhecidas assume-se paisagem 3:2, que é o mais provável
    // e o que menos destoa quando falha.
    const racio = item.width && item.height ? item.width / item.height : 1.5
    atual.push({ id: item.id, racio })
    soma += racio
    const util = larguraDisponivel - goteira * (atual.length - 1)
    if (soma * alturaAlvo >= util) fechar(true)
  }
  fechar(false)

  return linhas
}
