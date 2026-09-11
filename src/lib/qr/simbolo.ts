import { asset } from '../asset'

/**
 * O símbolo da NEBULA, carregado uma vez por cor e reaproveitado.
 *
 * São duas imagens e não uma pintada de outra cor: o símbolo tem linhas finas
 * dentro da letra, e recolori-lo no canvas fá-las-ia desaparecer.
 */
const carregadas = new Map<'preto' | 'branco', Promise<HTMLImageElement | null>>()

export function simbolo(cor: 'preto' | 'branco'): Promise<HTMLImageElement | null> {
  const guardado = carregadas.get(cor)
  if (guardado) return guardado

  const promessa = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    // Sem símbolo o código continua a funcionar. Falhar o desenho todo por
    // causa de um logótipo que não carregou seria trocar o essencial pelo
    // acessório.
    img.onerror = () => resolve(null)
    img.src = asset(`brand/logo-symbol-${cor === 'preto' ? 'black' : 'white'}.png`)
  })
  carregadas.set(cor, promessa)
  return promessa
}
