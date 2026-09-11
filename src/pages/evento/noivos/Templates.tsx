import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Printer, X } from 'lucide-react'
import QrNebula from '../../../components/QrNebula'
import { type Modelo, MODELOS } from './modelos'

/**
 * Cartazes A4 prontos a imprimir, com o código do casamento.
 *
 * Existem porque o código sozinho não chega. Um casal que descarrega um PNG
 * fica com um quadrado preto e o trabalho todo por fazer: abrir um programa de
 * desenho, escolher um tipo de letra, escrever o nome, centrar. A maior parte
 * não faz isso, e o código acaba impresso numa folha branca com o endereço
 * escrito à mão por baixo.
 *
 * As medidas estão em milímetros e não em pixels. É o que faz a folha sair do
 * papel do mesmo tamanho em que aparece no ecrã, sem depender da resolução de
 * quem imprime.
 */

interface DadosFolha {
  modelo: Modelo
  titulo: string
  mensagem: string
  casal: string
  data: string
  url: string
}

/* ── a folha ─────────────────────────────────────────────────────────────── */

function Folha({ modelo, titulo, mensagem, casal, data, url }: DadosFolha) {
  const qr = (
    <QrNebula
      url={url}
      tamanho={1400}
      cor={modelo.escuro ? 'branco' : 'preto'}
      className="w-full h-full block"
    />
  )

  const comum = 'folha-a4 relative flex flex-col items-center text-center'

  if (modelo.id === 'minimal') {
    return (
      <div className={`${comum} bg-white text-[#141414] justify-center px-[22mm] py-[24mm]`}>
        <p className="font-serif text-[13pt] tracking-[0.02em]">{casal}</p>
        <div className="w-[86mm] h-[86mm] my-[16mm]">{qr}</div>
        <p className="text-[11pt] uppercase tracking-[0.28em] text-[#141414]/55">{mensagem}</p>
        <p className="mt-auto text-[8pt] uppercase tracking-[0.3em] text-[#141414]/35">{data}</p>
      </div>
    )
  }

  if (modelo.id === 'editorial') {
    /*
      Uma revista, não um aviso.

      A versão anterior era tímida: um título pequeno em cima, o código a
      encolher num canto, e metade da folha vazia sem razão. Aqui o título
      ocupa o terço de cima e sangra até à margem, e o código está grande e
      alinhado com ele. O que se pendura numa parede tem de se ler da porta.
    */
    return (
      <div className={`${comum} bg-white text-[#141414] items-stretch text-left px-[18mm] py-[16mm]`}>
        <div className="flex items-baseline justify-between gap-[8mm]">
          <p className="text-[8pt] uppercase tracking-[0.32em] text-[#141414]/45">
            Fotografias dos convidados
          </p>
          <p className="text-[8pt] uppercase tracking-[0.32em] text-[#141414]/45">{data}</p>
        </div>
        <div className="w-full h-[0.6mm] bg-[#141414] mt-[4mm]" />

        <h1 className="font-serif text-[46pt] leading-[0.98] mt-[10mm] tracking-[-0.01em]">
          {titulo}
        </h1>

        <div className="flex items-end gap-[10mm] mt-auto pt-[12mm]">
          <div className="flex-1 min-w-0">
            <p className="font-serif text-[22pt] leading-tight">{casal}</p>
            <div className="w-[18mm] h-px bg-[#141414]/30 my-[6mm]" />
            <p className="text-[11.5pt] leading-relaxed text-[#141414]/70">{mensagem}</p>
          </div>
          <div className="w-[74mm] h-[74mm] shrink-0">{qr}</div>
        </div>

        <div className="w-full h-px bg-[#141414]/15 mt-[10mm]" />
        <p className="text-[7.5pt] uppercase tracking-[0.32em] text-[#141414]/35 mt-[3mm]">
          proj3ctnebula.pt
        </p>
      </div>
    )
  }

  if (modelo.id === 'noite') {
    return (
      <div className={`${comum} bg-[#141414] text-[#fcfff0] justify-center px-[22mm] py-[24mm]`}>
        <p className="text-[8pt] uppercase tracking-[0.32em] text-[#fcfff0]/45">{data}</p>
        <h1 className="font-serif text-[30pt] leading-[1.1] mt-[8mm] max-w-[130mm]">{titulo}</h1>
        <div className="w-[80mm] h-[80mm] my-[14mm]">{qr}</div>
        <p className="text-[12pt] leading-relaxed text-[#fcfff0]/60 max-w-[110mm]">{mensagem}</p>
        <p className="font-serif text-[15pt] mt-[12mm]">{casal}</p>
      </div>
    )
  }

  if (modelo.id === 'moldura') {
    return (
      <div className={`${comum} bg-[#f6f2ea] text-[#141414] justify-center px-[18mm] py-[20mm]`}>
        <div className="absolute inset-[10mm] border border-[#141414]/20" />
        <div className="absolute inset-[12mm] border border-[#141414]/10" />
        <div className="relative flex flex-col items-center">
          <p className="text-[8pt] uppercase tracking-[0.32em] text-[#141414]/45">{data}</p>
          <p className="font-serif text-[26pt] leading-tight mt-[6mm]">{casal}</p>
          <div className="w-[16mm] h-px bg-[#141414]/25 my-[8mm]" />
          <h1 className="font-serif text-[16pt] leading-snug max-w-[110mm]">{titulo}</h1>
          <div className="w-[76mm] h-[76mm] my-[12mm]">{qr}</div>
          <p className="text-[11pt] leading-relaxed text-[#141414]/60 max-w-[105mm]">{mensagem}</p>
        </div>
      </div>
    )
  }

  // Clássico
  return (
    <div className={`${comum} bg-[#faf8f4] text-[#141414] justify-center px-[22mm] py-[24mm]`}>
      <p className="text-[8pt] uppercase tracking-[0.32em] text-[#141414]/45">{data}</p>
      <p className="font-serif text-[30pt] leading-tight mt-[6mm]">{casal}</p>
      <h1 className="font-serif text-[17pt] leading-snug mt-[10mm] max-w-[120mm] text-[#141414]/80">
        {titulo}
      </h1>
      <div className="w-[84mm] h-[84mm] my-[14mm]">{qr}</div>
      <p className="text-[12pt] leading-relaxed text-[#141414]/65 max-w-[110mm]">{mensagem}</p>
    </div>
  )
}

/* ── a janela ────────────────────────────────────────────────────────────── */

interface Props {
  url: string
  casal: string
  data: string
  aoFechar: () => void
}

export default function Templates({ url, casal, data, aoFechar }: Props) {
  const [escolhido, setEscolhido] = useState<Modelo | null>(null)
  const [titulo, setTitulo] = useState('')
  const [mensagem, setMensagem] = useState('')

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

  const abrir = (m: Modelo) => {
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
            <p className="label-sm">{escolhido ? escolhido.nome : 'Cartazes para imprimir'}</p>
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
                casal={casal}
                data={data}
                url={url}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 sm:px-6 py-8">
          <h2 className="font-serif text-2xl sm:text-3xl mb-7">Os nossos templates</h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {MODELOS.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => abrir(m)}
                  className="group w-full text-left"
                >
                  <span className="block rounded-lg overflow-hidden border border-white/10 group-hover:border-white/35 transition-colors">
                    <span className="folha-miniatura block">
                      <Folha
                        modelo={m}
                        titulo={m.titulo}
                        mensagem={m.mensagem}
                        casal={casal}
                        data={data}
                        url={url}
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
