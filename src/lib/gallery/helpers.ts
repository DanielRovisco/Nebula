/** Sugere um código a partir do título: "Ana & Tiago" → "ana-e-tiago". */
export function slugify(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' e ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Password legível e fácil de ditar ao telefone, sem caracteres ambíguos. */
export function suggestPassword() {
  const words = ['luz', 'foco', 'raiz', 'onda', 'norte', 'calma', 'vento', 'lago', 'ramo', 'mare']
  const w = words[Math.floor(Math.random() * words.length)]
  return `${w}-${Math.floor(1000 + Math.random() * 9000)}`
}

/**
 * A letra que entra no nome de um ficheiro repetido: 0 é "a", 25 é "z", 26 é
 * "aa". Como as colunas de uma folha de cálculo.
 */
function letraDeOrdem(i: number): string {
  let saida = ''
  let n = i
  do {
    saida = String.fromCharCode(97 + (n % 26)) + saida
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return saida
}

/**
 * Um nome que ainda não está ocupado, com uma letra acrescentada ao fim.
 *
 *   casamento.jpg → casamento-a.jpg → casamento-b.jpg → … → casamento-aa.jpg
 *
 * A letra vai antes da extensão e não depois: é a extensão que diz ao sistema
 * do cliente com que programa abrir o ficheiro, e "casamento.jpg-a" é um
 * ficheiro que ninguém abre com dois cliques.
 *
 * A comparação é feita em minúsculas porque é assim que os sistemas de quem vai
 * receber isto se comportam: no Windows e no macOS, FOTO.JPG e foto.jpg são o
 * mesmo ficheiro, e dois ficheiros assim na mesma pasta dão uma pergunta ao
 * cliente que nós é que devíamos ter respondido.
 */
export function nomeLivre(nome: string, ocupados: Set<string>): string {
  if (!ocupados.has(nome.toLowerCase())) return nome

  const ponto = nome.lastIndexOf('.')
  // `> 0` e não `>= 0`: um nome que comece por ponto é um ficheiro escondido
  // sem extensão, e não um ficheiro com o nome vazio.
  const base = ponto > 0 ? nome.slice(0, ponto) : nome
  const extensao = ponto > 0 ? nome.slice(ponto) : ''

  for (let i = 0; ; i++) {
    const candidato = `${base}-${letraDeOrdem(i)}${extensao}`
    if (!ocupados.has(candidato.toLowerCase())) return candidato
  }
}
