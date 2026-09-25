import QrNebula from '../../components/QrNebula'
import JanelaCartazes, {
  type ModeloCartaz, type PropsFolha,
} from '../../components/cartazes/JanelaCartazes'
import { MODELOS_IMPRESSAO } from './modelosImpressao'

/* ── a folha ─────────────────────────────────────────────────────────────── */

function Folha({ modelo, titulo, mensagem, nome, data, url, preco }: PropsFolha<ModeloCartaz>) {
  const qr = (tamanho = 1400) => (
    <QrNebula
      url={url}
      tamanho={tamanho}
      cor={modelo.escuro ? 'branco' : 'preto'}
      className="w-full h-full block"
    />
  )

  const comum = 'folha-a4 relative flex flex-col items-center text-center'

  /*
    O preço numa etiqueta com contorno, e não misturado no texto.

    É a pergunta que se faz à frente da mesa, e tem de se responder sozinha a
    quem só olha de passagem. Dentro do parágrafo passava despercebido; com um
    traço à volta lê-se antes do resto.
  */
  const etiquetaPreco = (claro = false) =>
    preco && (
      <p
        className={`inline-block border rounded-full px-[9mm] py-[3.5mm] text-[13pt] tracking-[0.04em] ${
          claro
            ? 'border-[#fcfff0]/35 text-[#fcfff0]'
            : 'border-[#141414]/30 text-[#141414]'
        }`}
      >
        {preco}
      </p>
    )

  if (modelo.id === 'numero') {
    /*
      O número gigante por trás de tudo.

      É a única coisa que alguém tem de dizer em voz alta na mesa, e é por isso
      que ele é o desenho em vez de ser um detalhe. O 042 é inventado e serve de
      exemplo: quem olha percebe em dois segundos que as fotografias têm números
      e que é assim que se pede uma.

      Estava a 190mm e não se lia: três algarismos desse tamanho não cabem na
      largura da folha, e o que sobrava eram formas. A 100mm cabem os três
      inteiros, sem o zero e o dois cortados pelas margens. Um número que não se
      lê não diz nada a ninguém.
    */
    return (
      <div className={`${comum} bg-[#faf8f4] text-[#141414] justify-center px-[18mm] py-[20mm] overflow-hidden`}>
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center font-semibold leading-none text-[#141414]/[0.06] select-none"
          style={{ fontSize: '100mm' }}
        >
          042
        </span>
        <div className="relative flex flex-col items-center">
          <p className="text-[9pt] uppercase tracking-[0.34em] text-[#141414]/50">{data}</p>
          <h1 className="font-serif text-[40pt] leading-[1.02] mt-[7mm] max-w-[150mm]">{titulo}</h1>
          <div className="w-[92mm] h-[92mm] my-[12mm]">{qr()}</div>
          <p className="text-[13pt] leading-relaxed text-[#141414]/70 max-w-[120mm]">{mensagem}</p>
          {preco && <div className="mt-[9mm]">{etiquetaPreco()}</div>}
          <p className="font-serif text-[16pt] mt-[10mm]">{nome}</p>
        </div>
      </div>
    )
  }

  if (modelo.id === 'escuro') {
    return (
      <div className={`${comum} bg-[#141414] text-[#fcfff0] justify-center px-[18mm] py-[20mm]`}>
        <p className="text-[9pt] uppercase tracking-[0.34em] text-[#fcfff0]/50">{nome}</p>
        <h1 className="font-serif text-[42pt] leading-[1.0] mt-[7mm] max-w-[150mm]">{titulo}</h1>
        {/*
          O código sobre um quadrado claro, e não directamente no preto.

          Um código claro sobre fundo escuro lê-se, mas numa sala às escuras
          obriga o telemóvel a trabalhar com o pouco contraste que sobra. O
          quadrado devolve-lhe o contraste todo, e numa mesa de impressão o que
          não pode acontecer é alguém apontar a câmara e desistir.
        */}
        <div className="bg-[#fcfff0] p-[7mm] rounded-[3mm] my-[12mm]">
          <div className="w-[88mm] h-[88mm]">
            <QrNebula url={url} tamanho={1400} cor="preto" className="w-full h-full block" />
          </div>
        </div>
        <p className="text-[13pt] leading-relaxed text-[#fcfff0]/70 max-w-[125mm]">{mensagem}</p>
        {preco && <div className="mt-[9mm]">{etiquetaPreco(true)}</div>}
        <p className="text-[8pt] uppercase tracking-[0.34em] text-[#fcfff0]/40 mt-[10mm]">{data}</p>
      </div>
    )
  }

  if (modelo.id === 'passos') {
    const passos = [
      ['1', 'Aponta a câmara ao código'],
      ['2', 'Encontra a tua fotografia'],
      ['3', 'Diz-nos o número'],
    ]
    return (
      <div className={`${comum} bg-white text-[#141414] items-stretch text-left px-[16mm] py-[15mm]`}>
        <div className="flex items-baseline justify-between gap-[8mm]">
          <p className="text-[9pt] uppercase tracking-[0.34em] text-[#141414]/45">{nome}</p>
          <p className="text-[9pt] uppercase tracking-[0.34em] text-[#141414]/45">{data}</p>
        </div>
        <div className="w-full h-[0.8mm] bg-[#141414] mt-[4mm]" />

        <h1 className="font-serif text-[44pt] leading-[0.98] mt-[9mm]">{titulo}</h1>
        <p className="text-[12.5pt] leading-relaxed text-[#141414]/65 mt-[5mm] max-w-[125mm]">
          {mensagem}
        </p>

        {/*
          Os passos em baixo do título, a toda a largura, e o código sozinho por
          baixo deles.

          Ao lado um do outro não cabiam: o código grande deixava à lista uma
          coluna estreita, e cada passo partia-se em três linhas. Assim cada
          passo é uma linha só, lê-se de pé, e o código fica com a folha toda
          para ser grande.
        */}
        <ul className="mt-[12mm] space-y-[10mm]">
          {passos.map(([n, texto]) => (
            <li key={n} className="flex items-center gap-[8mm]">
              <span className="w-[18mm] h-[18mm] shrink-0 rounded-full bg-[#141414] text-white flex items-center justify-center text-[20pt] font-semibold">
                {n}
              </span>
              <span className="text-[20pt] leading-tight">{texto}</span>
            </li>
          ))}
        </ul>

        <div className="w-[84mm] h-[84mm] self-center my-auto">{qr()}</div>

        <div className="w-full h-px bg-[#141414]/15 mt-auto" />
        <div className="flex items-center justify-between gap-[8mm] mt-[3mm]">
          <p className="text-[8pt] uppercase tracking-[0.34em] text-[#141414]/35">
            proj3ctnebula.pt
          </p>
          {preco && (
            <p className="text-[13pt] tracking-[0.04em] text-[#141414]">{preco}</p>
          )}
        </div>
      </div>
    )
  }

  if (modelo.id === 'mesa') {
    /*
      Um cartão de mesa: dobra-se a meio e fica de pé sozinho.

      A metade de cima está virada ao contrário de propósito. Dobrada a folha na
      linha do meio, as duas metades ficam a direito e viradas para lados
      opostos, e o cartão lê-se dos dois lados da mesa sem ninguém lhe pegar.
      Numa mesa de impressão isso vale mais do que um cartaz encostado a um copo.

      Vai tudo mais pequeno porque cada metade é meia folha, e não uma folha.
    */
    /*
      `h-full` e não `h-1/2`: quem manda na altura é o contentor de fora, que já
      é meia folha. A meio de meia folha o conteúdo transbordava a dobra, e o
      nome do casal aparecia do lado errado do cartão.
    */
    const metade = (
      <div className="h-full w-full flex flex-col items-center justify-center px-[16mm] text-center">
        <p className="text-[8pt] uppercase tracking-[0.34em] text-[#141414]/45">{nome}</p>
        <h1 className="font-serif text-[30pt] leading-[1.05] mt-[5mm] max-w-[140mm]">{titulo}</h1>
        <div className="w-[66mm] h-[66mm] my-[8mm]">{qr(900)}</div>
        <p className="text-[12pt] leading-snug text-[#141414]/65 max-w-[120mm]">{mensagem}</p>
        {preco && <p className="text-[12pt] tracking-[0.04em] mt-[4mm]">{preco}</p>}
      </div>
    )
    return (
      <div className={`${comum} bg-[#faf8f4] text-[#141414]`}>
        {/*
          Sem margem no contentor: cada metade é exactamente metade da folha, e
          qualquer margem aqui empurrava a dobra para fora do meio. Dobrado fora
          do meio, o cartão não assenta na mesa.
        */}
        <div className="h-1/2 w-full shrink-0 rotate-180">{metade}</div>
        {/* A linha da dobra, a tracejado, para não haver dúvidas de onde dobrar. */}
        <div className="absolute left-[12mm] right-[12mm] top-1/2 border-t border-dashed border-[#141414]/25" />
        <div className="h-1/2 w-full shrink-0">{metade}</div>
      </div>
    )
  }

  // Leva contigo
  return (
    <div className={`${comum} bg-[#141414] text-[#fcfff0] justify-center px-[16mm] py-[18mm]`}>
      <p className="text-[9pt] uppercase tracking-[0.34em] text-[#fcfff0]/45">{data}</p>
      {/*
        O título ocupa o terço de cima e lê-se da outra ponta da sala. É a
        primeira coisa que alguém vê ao passar pela mesa, e tem de dizer sozinho
        o que ali se faz.
      */}
      <h1 className="font-semibold text-[58pt] leading-[0.92] tracking-[-0.02em] mt-[6mm] max-w-[160mm] uppercase">
        {titulo}
      </h1>
      <div className="bg-[#fcfff0] p-[7mm] rounded-[3mm] my-[13mm]">
        <div className="w-[86mm] h-[86mm]">
          <QrNebula url={url} tamanho={1400} cor="preto" className="w-full h-full block" />
        </div>
      </div>
      <p className="text-[14pt] leading-relaxed text-[#fcfff0]/75 max-w-[130mm]">{mensagem}</p>
      {preco && <div className="mt-[9mm]">{etiquetaPreco(true)}</div>}
      <p className="font-serif text-[17pt] mt-[9mm]">{nome}</p>
    </div>
  )
}

/* ── a janela ────────────────────────────────────────────────────────────── */

export default function CartazesImpressao({
  url, nome, data, aoFechar,
}: {
  url: string
  nome: string
  data: string
  aoFechar: () => void
}) {
  return (
    <JanelaCartazes
      modelos={MODELOS_IMPRESSAO}
      Folha={Folha}
      cabecalho="Cartazes da mesa"
      titulo="Para a mesa de impressão"
      url={url}
      nome={nome}
      data={data}
      comPreco
      aoFechar={aoFechar}
    />
  )
}
