/**
 * Os cinco cartazes.
 *
 * Só dados: nome, textos de arranque e se o fundo é escuro. O desenho de cada
 * um vive em Templates.tsx. Estão separados porque um ficheiro que exporta
 * componentes e constantes ao mesmo tempo parte o recarregamento rápido durante
 * o desenvolvimento.
 */
export interface Modelo {
  id: string
  nome: string
  /** Fundo escuro: o código passa a claro para se ler. */
  escuro?: boolean
  titulo: string
  mensagem: string
}

export const MODELOS: Modelo[] = [
  {
    id: 'classico',
    nome: 'Clássico',
    titulo: 'O nosso dia, pelos vossos olhos',
    mensagem: 'Aponta a câmara ao código e deixa-nos as tuas fotografias.',
  },
  {
    id: 'minimal',
    nome: 'Mínimo',
    titulo: 'Partilha o teu olhar',
    mensagem: 'Aponta a câmara ao código',
  },
  {
    id: 'editorial',
    nome: 'Editorial',
    titulo: 'Viste alguma coisa bonita? Deixa-a aqui.',
    mensagem: 'Aponta a câmara e escolhe as tuas. Não é preciso mais nada.',
  },
  {
    id: 'noite',
    nome: 'Noite',
    escuro: true,
    titulo: 'A festa é vossa. As fotografias também.',
    mensagem: 'Aponta a câmara e partilha o que viste.',
  },
  {
    id: 'moldura',
    nome: 'Moldura',
    titulo: 'Guardem connosco este dia',
    mensagem: 'As vossas fotografias vão directas para nós.',
  },
]
