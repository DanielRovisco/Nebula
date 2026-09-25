import { useEffect, useState, type ComponentType } from 'react'
import { createPortal } from 'react-dom'
import { Printer, Tag, X } from 'lucide-react'

/**
 * A janela dos cartazes A4: a grelha de modelos, os campos de texto e a folha
 * em tamanho real.
 *
 * Isto era parte do ficheiro dos cartazes dos convidados, e saiu de lá quando
 * a estação de impressão passou a ter os seus. Ficaram dois conjuntos com
 * propósitos opostos — um pede fotografias, o outro convida a vê-las — mas com
 * a mesma mecânica de escolher, editar e imprimir. Duplicá-la era ter dois
 * sítios onde corrigir o mesmo defeito, e um deles a ficar para trás.
 *
 * As medidas dos cartazes estão em milímetros e não em pixels. É o que faz a
 * folha sair do papel do mesmo tamanho em que aparece no ecrã, sem depender da
 * resolução de quem imprime.
 */
export interface ModeloCartaz {
  id: string
  nome: string
  /** Fundo escuro: o código passa a claro para se ler. */
  escuro?: boolean
  titulo: string
  mensagem: string
}

export interface PropsFolha<M extends ModeloCartaz> {
  modelo: M
  titulo: string
  mensagem: string
  nome: string
  data: string
  url: string
  /** O preço já escrito por extenso, ou `null` quando não se mostra. */
  preco: string | null
}

export default function JanelaCartazes<M extends ModeloCartaz>({
  modelos,
  Folha,
  cabecalho,
  titulo: tituloLista,
  url,
  nome,
  data,
  comPreco = false,
  aoFechar,
}: {
  modelos: M[]
  Folha: ComponentType<PropsFolha<M>>
  /** O que se lê na barra de cima enquanto se escolhe. */
  cabecalho: string
  /** O título da grelha de modelos. */
  titulo: string
  url: string
  nome: string
  data: string
  /** Oferece o preço por fotografia como um campo do cartaz. */
  comPreco?: boolean
  aoFechar: () => void
}) {
  const [escolhido, setEscolhido] = useState<M | null>(null)
  const [titulo, setTitulo] = useState('')
  const [mensagem, setMensagem] = useState('')
  /*
    O preço é opcional e começa ligado, porque numa mesa de impressão a pergunta
    que toda a gente faz é quanto custa. Quem não quiser anunciá-lo desliga-o
    num clique, em vez de ter de apagar texto à mão em cada modelo.

    Fica editável porque quatro euros é o preço de hoje, e um cartaz que obriga
    a mexer no código para mudar de preço é um cartaz que sai errado.
  */
  const [mostrarPreco, setMostrarPreco] = useState(true)
  const [preco, setPreco] = useState('4')

  const precoEscrito = comPreco && mostrarPreco && preco.trim()
    ? `${preco.trim()} € por fotografia`
    : null

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (escolhido) setEscolhido(null)
      else aoFechar()
    }
    document.addEventListener('keydown', tecla)
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', tecla)
      document.body.style.overflow = antes
    }
  }, [escolhido, aoFechar])

  const abrir = (m: M) => {
    setEscolhido(m)
    setTitulo(m.titulo)
    setMensagem(m.mensagem)
  }

  return createPortal(
    <div className="janela-cartazes fixed inset-0 z-[100] bg-eerie overflow-auto">
      {/*
        A barra não entra na impressão, nem nenhuma outra parte da página: só a
        folha sai no papel. É o `folha-impressao` no CSS que trata disso.
      */}
      <header className="sem-impressao sticky top-0 z-10 bg-eerie/95 backdrop-blur border-b border-white/[0.08]">
        <div className="flex items-center gap-3 px-4 sm:px-6 h-16">
          <button
            onClick={() => (escolhido ? setEscolhido(null) : aoFechar())}
            aria-label="Fechar"
            className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-titanium/55 hover:text-titanium hover:bg-white/[0.07] transition-colors"
          >
            <X size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="label-sm">{escolhido ? escolhido.nome : cabecalho}</p>
          </div>
          {escolhido && (
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-titanium text-eerie text-[11px] uppercase tracking-[0.12em] hover:bg-titanium/90 transition-colors min-h-[44px]"
            >
              <Printer size={14} /> Imprimir
            </button>
          )}
        </div>
      </header>

      {escolhido ? (
        <div className="corpo-cartaz px-4 sm:px-6 py-8">
          <div className="sem-impressao max-w-[210mm] mx-auto mb-7 space-y-4">
            <Campo etiqueta="Título" valor={titulo} aoMudar={setTitulo} maximo={70} />
            <Campo etiqueta="Mensagem" valor={mensagem} aoMudar={setMensagem} maximo={140} />
            {comPreco && (
              <div className="flex items-end gap-4">
                <button
                  type="button"
                  role="switch"
                  aria-checked={mostrarPreco}
                  onClick={() => setMostrarPreco((v) => !v)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-full border text-[11px] uppercase tracking-[0.12em] transition-colors ${
                    mostrarPreco
                      ? 'bg-titanium text-eerie border-transparent'
                      : 'border-white/15 text-titanium/55 hover:text-titanium hover:border-white/35'
                  }`}
                >
                  <Tag size={14} /> Preço por fotografia
                </button>
                {mostrarPreco && (
                  <label className="block w-28">
                    <span className="label-sm">Euros</span>
                    <input
                      value={preco}
                      onChange={(e) => setPreco(e.target.value)}
                      inputMode="decimal"
                      maxLength={6}
                      className="w-full mt-2 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 text-titanium/85 focus:border-white/30 outline-none transition-colors"
                    />
                  </label>
                )}
              </div>
            )}
          </div>

          {/*
            A folha é desenhada no tamanho real e encolhida para caber no ecrã.
            Encolher no fim, e não desenhar mais pequeno, é o que garante que o
            que sai na impressora é o que está aqui.
          */}
          <div className="folha-palco">
            <div className="folha-impressao">
              <Folha
                modelo={escolhido}
                titulo={titulo}
                mensagem={mensagem}
                nome={nome}
                data={data}
                url={url}
                preco={precoEscrito}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 sm:px-6 py-8">
          <h2 className="font-serif text-2xl sm:text-3xl mb-7">{tituloLista}</h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {modelos.map((m) => (
              <li key={m.id}>
                <button onClick={() => abrir(m)} className="group w-full text-left">
                  <span className="block rounded-lg overflow-hidden border border-white/10 group-hover:border-white/35 transition-colors">
                    <span className="folha-miniatura block">
                      <Folha
                        modelo={m}
                        titulo={m.titulo}
                        mensagem={m.mensagem}
                        nome={nome}
                        data={data}
                        url={url}
                        preco={precoEscrito}
                      />
                    </span>
                  </span>
                  <span className="block text-sm text-titanium/60 group-hover:text-titanium mt-2.5 transition-colors">
                    {m.nome}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>,
    document.body,
  )
}

function Campo({
  etiqueta, valor, aoMudar, maximo,
}: { etiqueta: string; valor: string; aoMudar: (v: string) => void; maximo: number }) {
  return (
    <label className="block">
      <span className="label-sm">{etiqueta}</span>
      <input
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        maxLength={maximo}
        className="w-full mt-2 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 text-titanium/85 focus:border-white/30 outline-none transition-colors"
      />
    </label>
  )
}
