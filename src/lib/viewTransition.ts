/**
 * View Transitions: o browser fotografa o antes e o depois e anima a passagem
 * entre os dois. Os elementos que partilham o mesmo `view-transition-name`
 * são ligados — é o que faz a miniatura crescer até à posição final em vez de
 * a imagem grande aparecer por cima.
 *
 * Ainda não existe em todos os browsers (falta no Firefox à data de escrita),
 * e quem pediu menos movimento no sistema não o deve levar. Nesses casos o
 * estado muda na mesma, apenas sem animação — nunca deixa de funcionar.
 */
type ComTransicao = Document & {
  startViewTransition?: (cb: () => void) => { finished: Promise<void> }
}

export function comTransicao(mudar: () => void, animar = true) {
  const doc = document as ComTransicao
  if (!animar || typeof doc.startViewTransition !== 'function') {
    mudar()
    return
  }
  doc.startViewTransition(mudar)
}
