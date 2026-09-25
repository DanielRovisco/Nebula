import QrNebula from '../../../components/QrNebula'
import JanelaCartazes, { type PropsFolha } from '../../../components/cartazes/JanelaCartazes'
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

/* ── a folha ─────────────────────────────────────────────────────────────── */

function Folha({ modelo, titulo, mensagem, nome: casal, data, url }: PropsFolha<Modelo>) {
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

export default function Templates({ url, casal, data, aoFechar }: {
  url: string
  casal: string
  data: string
  aoFechar: () => void
}) {
  return (
    <JanelaCartazes
      modelos={MODELOS}
      Folha={Folha}
      cabecalho="Cartazes para imprimir"
      titulo="Os nossos templates"
      url={url}
      nome={casal}
      data={data}
      aoFechar={aoFechar}
    />
  )
}
