/**
 * A mensagem que se manda ao cliente, e a password que ela precisa.
 *
 * A password fica guardada cifrada e não há como a ler de volta — é isso que
 * garante que nem nós a conseguimos ver na base de dados. Mas ela é precisa
 * uma vez, para a entregar a quem vai abrir a galeria.
 *
 * Guarda-se em `sessionStorage`, no browser de quem a definiu e só nesse
 * separador: desaparece ao fechar. É o mesmo texto que já esteve no ecrã ao
 * criar a galeria, portanto não se revela nada de novo — só se evita ter de o
 * escrever outra vez cinco minutos depois. Fechado o browser, a galeria
 * continua a funcionar; o que se perde é o atalho, e aí pede-se a password.
 */
const chave = (galeriaId: string) => `nebula-pass-${galeriaId}`

export function guardarPassword(galeriaId: string, password: string) {
  try {
    sessionStorage.setItem(chave(galeriaId), password)
  } catch {
    /* sem sessionStorage o botão pergunta pela password; não é grave */
  }
}

export function lerPassword(galeriaId: string): string | null {
  try {
    return sessionStorage.getItem(chave(galeriaId))
  } catch {
    return null
  }
}

/**
 * O texto a colar na conversa com o cliente.
 *
 * Sem saudação nem assinatura de propósito: vai para dentro de uma mensagem
 * que já tem as duas, e ninguém quer apagar um "Olá!" antes de escrever o seu.
 */
export function mensagemDePartilha(titulo: string, link: string, password: string) {
  return `${titulo}\n\nLink: ${link}\nPassword: ${password}`
}
