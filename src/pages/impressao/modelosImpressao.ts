import type { ModeloCartaz } from '../../components/cartazes/JanelaCartazes'

/**
 * Os cartazes da mesa de impressão.
 *
 * São outra coisa que os dos convidados, e a diferença não é de gosto: aqueles
 * pedem fotografias, estes convidam a ver as que já lá estão e a pedir uma
 * impressa. Um diz "deixa-nos o teu olhar", o outro diz "encontra-te e diz o
 * número". Usar os mesmos em cima da mesa seria pedir a alguém que enviasse
 * fotografias quando o que está ali é uma impressora.
 *
 * E o sítio também é outro. O cartaz dos convidados fica numa mesa de jantar,
 * lido sentado e de perto. Este fica ao lado de uma impressora, numa sala às
 * escuras, visto de pé e de longe, a competir com a música e com o bar. Daí
 * serem mais gritados: tipos de letra maiores, mais contraste, e o código bem
 * maior do que nos outros.
 */
export const MODELOS_IMPRESSAO: ModeloCartaz[] = [
  {
    id: 'leva',
    nome: 'Leva contigo',
    titulo: 'Leva uma contigo',
    mensagem: 'Aponta a câmara, encontra-te, e diz-nos o número.',
  },
  {
    id: 'numero',
    nome: 'O número',
    titulo: 'Já estás aqui',
    mensagem: 'Cada fotografia tem um número. Diz-nos o teu e imprimimos.',
  },
  {
    id: 'escuro',
    nome: 'Escuro',
    escuro: true,
    titulo: 'As fotografias desta noite',
    mensagem: 'Aponta a câmara e vê-as todas. A que gostares sai daqui em papel.',
  },
  {
    id: 'passos',
    nome: 'Três passos',
    titulo: 'Como levas a tua',
    mensagem: 'Sem aplicações e sem contas. Só a câmara do telemóvel.',
  },
  {
    id: 'mesa',
    nome: 'De mesa',
    titulo: 'Vê e leva a tua',
    mensagem: 'Aponta a câmara ao código.',
  },
]
