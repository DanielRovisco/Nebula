/**
 * Guarda um código QR já desenhado como ficheiro PNG.
 *
 * Vive fora do componente porque não é um componente, e tê-lo no mesmo ficheiro
 * partia o recarregamento rápido durante o desenvolvimento.
 */
export function guardarQr(canvas: HTMLCanvasElement, nome: string) {
  const a = document.createElement('a')
  a.href = canvas.toDataURL('image/png')
  // Um nome de ficheiro com barras ou dois pontos é recusado por alguns
  // sistemas, e "Joana & Miguel" tem tudo para dar problemas.
  a.download = `${nome.replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-').toLowerCase()}.png`
  a.click()
}
