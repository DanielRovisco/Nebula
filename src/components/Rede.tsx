import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * Rede de segurança à volta das páginas.
 *
 * Sem ela, um erro em qualquer página desmonta a aplicação inteira e o
 * visitante fica com um ecrã branco: nenhuma explicação, nenhum caminho de
 * volta, e nem sequer a certeza de que o site existe. Numa página que alguém
 * abriu para ver as fotografias do seu casamento, isso é o pior desfecho
 * possível.
 *
 * O texto está escrito para quem não sabe nem quer saber o que correu mal, e
 * dá as duas saídas que resolvem quase sempre: recarregar, e voltar ao início.
 *
 * Tem de ser uma classe. É a única forma de apanhar erros de render em React,
 * e não há equivalente com hooks.
 */
interface Props {
  children: ReactNode
}
interface Estado {
  falhou: boolean
}

export default class Rede extends Component<Props, Estado> {
  state: Estado = { falhou: false }

  static getDerivedStateFromError(): Estado {
    return { falhou: true }
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    // Vai para a consola e mais nada: não há serviço de recolha de erros, e
    // inventar um pedido para um servidor qualquer seria mandar dados de quem
    // visita para fora sem o dizer na política de privacidade.
    console.error('Erro não tratado:', erro, info.componentStack)
  }

  render() {
    if (!this.state.falhou) return this.props.children

    return (
      <div className="min-h-screen flex items-center justify-center container-px">
        <div className="max-w-md text-center">
          <span className="label-sm">Alguma coisa correu mal</span>
          <h1 className="text-3xl sm:text-4xl mt-4 mb-5 leading-tight">
            Esta página não abriu.
          </h1>
          <p className="text-sm text-titanium/55 leading-relaxed mb-8">
            Quase sempre resolve-se a recarregar. Se continuar, escreve-nos e
            resolvemos: as fotografias estão guardadas e não se perde nada.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="bg-titanium text-eerie px-7 py-4 rounded-full text-[11px] uppercase tracking-[0.18em] font-semibold active:scale-95 transition-transform min-h-[48px]"
            >
              Recarregar
            </button>
            <a
              href="/"
              className="border border-white/20 px-7 py-4 rounded-full text-[11px] uppercase tracking-[0.18em] text-titanium/75 hover:border-white/40 transition-colors min-h-[48px] inline-flex items-center"
            >
              Voltar ao início
            </a>
          </div>
        </div>
      </div>
    )
  }
}
