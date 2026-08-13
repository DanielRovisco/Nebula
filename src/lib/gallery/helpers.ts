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
