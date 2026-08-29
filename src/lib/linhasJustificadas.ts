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

/** Sem dimensões conhecidas assume-se paisagem 3:2, o mais provável. */
const racioDe = (i: { width: number | null; height: number | null }) =>
  i.width && i.height ? i.width / i.height : 1.5

export function linhasJustificadas(
  itens: readonly { id: string; width: number | null; height: number | null }[],
  larguraDisponivel: number,
  alturaAlvo: number,
  goteira: number,
): Medida[][] {
  if (larguraDisponivel <= 0 || itens.length === 0) return []

  /*
    Dentro de uma linha todas as fotografias têm a mesma altura, por isso uma
    vertical sai sempre com cerca de metade da área de uma deitada. Não há
    como mudar isso sem a cortar — e não cortar era o objetivo.

    O que se pode fazer é não as misturar à força: quando a orientação muda e
    a linha já vai bem cheia, fecha-se ali. As verticais seguidas ficam numa
    linha só, que por ter menos largura a repartir sai mais alta, e passam a
    ocupar o dobro. Numa galeria a sério isto acontece muito, porque as
    fotografias vêm em séries da mesma orientação.
  */
  const LIMIAR_QUEBRA = 0.62
  /*
    Uma linha nunca passa de uma vez e meia a altura pedida. Sem tecto, duas
    verticais sozinhas numa linha esticavam-se até um ecrã inteiro de altura e
    o que era destaque passava a obstáculo.
  */
  const TETO = 1.55

  const linhas: Medida[][] = []
  let atual: { id: string; racio: number }[] = []
  let soma = 0

  const fechar = (esticar: boolean) => {
    if (!atual.length) return
    const util = larguraDisponivel - goteira * (atual.length - 1)
    /*
      A última linha não se estica. Com duas fotografias no fim, esticá-las
      até à margem dava-lhes o dobro da altura das de cima, e o que era o
      resto da grelha passava a parecer o destaque.
    */
    const bruta = esticar ? util / soma : Math.min(alturaAlvo, util / soma)
    const altura = Math.min(bruta, alturaAlvo * TETO)
    linhas.push(atual.map((x) => ({ id: x.id, largura: x.racio * altura, altura })))
    atual = []
    soma = 0
  }

  for (const item of itens) {
    const racio = racioDe(item)
    if (atual.length) {
      const util = larguraDisponivel - goteira * (atual.length - 1)
      const mudaOrientacao = racio < 1 !== atual[0].racio < 1
      if (mudaOrientacao && soma * alturaAlvo >= util * LIMIAR_QUEBRA) fechar(true)
    }
    atual.push({ id: item.id, racio })
    soma += racio
    const util = larguraDisponivel - goteira * (atual.length - 1)
    if (soma * alturaAlvo >= util) fechar(true)
  }
  fechar(false)

  return linhas
}
