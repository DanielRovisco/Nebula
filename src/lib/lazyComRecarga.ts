import { lazy, type ComponentType } from 'react'

/**
 * `lazy` que sobrevive a uma publicação nova.
 *
 * As páginas são carregadas à parte, cada uma no seu ficheiro, e o nome desse
 * ficheiro muda a cada publicação. Quem tinha o site aberto quando saiu uma
 * versão nova continua com a lista antiga na memória: ao mudar de página, vai
 * buscar um ficheiro que já não existe, recebe um 404, e fica com o ecrã em
 * branco sem uma linha que explique porquê.
 *
 * Aqui, um erro a carregar a página faz o browser recarregar sozinho. Vem a
 * lista nova e a navegação continua, com um piscar em vez de uma parede.
 *
 * A marca em `sessionStorage` evita o pior desfecho: se a página continuar a
 * faltar depois de recarregar, o problema não é a versão antiga, e recarregar
 * outra vez daria um ciclo infinito. Nesse caso deixa-se o erro subir, para
 * dar cara em vez de ficar a girar.
 */
const MARCA = 'nebula-recarga-modulo'

/*
  `ComponentType<any>` e não algo mais apertado: é a mesma assinatura que o
  `lazy` do React usa, e é o que deixa cada página manter as suas próprias
  props em vez de as perder todas para `unknown`.
*/
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyComRecarga<T extends ComponentType<any>>(
  importar: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      const modulo = await importar()
      // Correu bem: a próxima falha volta a ter direito a uma recarga.
      try {
        sessionStorage.removeItem(MARCA)
      } catch { /* sem sessionStorage o comportamento é o de sempre */ }
      return modulo
    } catch (erro) {
      let jaTentou: boolean
      try {
        jaTentou = sessionStorage.getItem(MARCA) === '1'
        sessionStorage.setItem(MARCA, '1')
      } catch {
        // Sem sessionStorage não há como saber se já se tentou, e recarregar
        // às cegas arriscava um ciclo sem fim. Deixa-se o erro subir.
        throw erro
      }
      if (jaTentou) throw erro
      window.location.reload()
      // A recarga não é imediata; esta promessa nunca resolve, e é isso que
      // impede o React de desenhar um erro no meio segundo que falta.
      return new Promise<{ default: T }>(() => {})
    }
  })
}
