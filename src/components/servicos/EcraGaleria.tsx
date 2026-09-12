import { Lock } from 'lucide-react'
import { useT } from '../../lib/i18n'

/**
 * A porta das galerias privadas, tal como ela é, dentro do telemóvel.
 *
 * Os textos são os mesmos que a página verdadeira usa (`t.galleryAccess`), e
 * isso é de propósito: no dia em que alguém mudar o título da página de acesso,
 * este ecrã muda com ele. Um mockup que mente sobre o produto é pior do que
 * não ter mockup nenhum.
 *
 * Os campos são caixas desenhadas e não `<input>`. Não há nada para escrever
 * aqui, e um campo a sério recebia o foco do teclado no meio de uma página de
 * serviços.
 */
export default function EcraGaleria() {
  const t = useT()

  return (
    <div className="h-full px-6 pt-16 flex flex-col justify-center">
      <div className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center mb-6">
        <Lock size={13} className="text-titanium/60" />
      </div>

      <span className="block text-[8px] uppercase tracking-[0.22em] text-titanium/45">
        {t.galleryAccess.label}
      </span>
      <h3 className="font-serif text-[26px] leading-[1.08] mt-2.5">{t.galleryAccess.title}</h3>
      <p className="text-[10px] text-titanium/45 leading-relaxed mt-3">{t.galleryAccess.intro}</p>

      <div className="mt-7 space-y-5">
        <div>
          <span className="block text-[8px] uppercase tracking-[0.22em] text-titanium/45 mb-2">
            {t.galleryAccess.code}
          </span>
          <div className="border-b border-white/15 pb-2 text-[11px] text-titanium/70">
            {t.services.mockup.codigo}
          </div>
        </div>
        <div>
          <span className="block text-[8px] uppercase tracking-[0.22em] text-titanium/45 mb-2">
            {t.galleryAccess.password}
          </span>
          {/*
            Os pontos de uma password escrita, e não um campo vazio: um
            formulário por preencher lê-se como uma página que ainda não
            carregou. Este está a um toque de entrar, que é a ideia.
          */}
          <div className="border-b border-white/30 pb-2 text-[12px] tracking-[0.3em] text-titanium/75">
            ••••••••
          </div>
        </div>
      </div>

      <div className="mt-8 w-full bg-titanium text-eerie rounded-full py-3.5 text-center text-[9px] uppercase tracking-[0.2em] font-semibold">
        {t.galleryAccess.enter}
      </div>
    </div>
  )
}
