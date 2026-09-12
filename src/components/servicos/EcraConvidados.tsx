import { ImagePlus } from 'lucide-react'
import { asset } from '../../lib/asset'
import { useT } from '../../lib/i18n'

/*
  Três fotografias do nosso portefólio a fazer de fotografias de convidados.

  São as pequenas (480px): dentro de um telemóvel de 272px nunca se vê mais do
  que isso, e pedir as de 1440 era mandar carregar dois megabytes para encher
  três quadrados de 80 pixels.
*/
const MINIATURAS = ['editorial-lake', 'gender-reveal-beach', 'palace-dome']

/**
 * A página dos convidados, dentro do telemóvel.
 *
 * Tem a estrutura da verdadeira, pela mesma ordem: o símbolo, o nome dos
 * noivos, a data, a frase deles, o botão grande, o campo do nome e as
 * fotografias que já entraram. Quem chega aqui vindo de um casamento nosso
 * reconhece o ecrã, e quem está a pensar casar percebe em dois segundos o que
 * os convidados vão ver.
 *
 * Os nomes e a data são inventados, e é preciso que se perceba: são um casal
 * de exemplo, não um casamento nosso a ser mostrado sem autorização.
 */
export default function EcraConvidados() {
  const t = useT()
  const m = t.services.mockup

  return (
    <div className="h-full px-5 pt-14 text-center">
      <img
        src={asset('brand/logo-symbol-white.png')}
        alt=""
        width={1252}
        height={1494}
        className="h-7 w-auto mx-auto mb-5 opacity-50"
      />

      <h3 className="font-serif leading-[1.05] text-[30px]">{m.casal}</h3>
      <p className="text-[8px] uppercase tracking-[0.22em] text-titanium/45 mt-3">{m.data}</p>

      <p className="text-[10px] text-titanium/55 leading-relaxed mt-4 text-balance px-2">
        {m.frase}
      </p>

      <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-5 flex flex-col items-center gap-1.5">
        <span className="w-9 h-9 rounded-full bg-titanium text-eerie flex items-center justify-center">
          <ImagePlus size={15} />
        </span>
        <span className="font-serif text-[17px] mt-0.5">{m.botao}</span>
        <span className="text-[8px] text-titanium/40">{m.limite}</span>
      </div>

      <div className="mt-4 border-b border-white/12 pb-2 text-[9px] text-titanium/25">{m.nome}</div>

      <div className="mt-5">
        <span className="block text-[8px] uppercase tracking-[0.22em] text-titanium/45 mb-2.5 text-left">
          {m.naGaleria}
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          {MINIATURAS.map((nome) => (
            <img
              key={nome}
              src={asset(`brand/portfolio/${nome}-480.webp`)}
              alt=""
              loading="lazy"
              decoding="async"
              className="w-full aspect-square object-cover rounded-md"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
