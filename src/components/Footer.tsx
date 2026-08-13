import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import InstagramIcon from '../lib/InstagramIcon'
import { asset } from '../lib/asset'
import { CONTACT } from '../lib/site'

const NAV = [
  { to: '/sobre', label: 'Sobre' },
  { to: '/servicos', label: 'Serviços' },
  { to: '/portfolio', label: 'Portfólio' },
  { to: '/contacto', label: 'Contacto' },
  { to: '/galeria', label: 'Galeria privada' },
]

export default function Footer() {
  return (
    <footer className="bg-eerie border-t border-white/[0.08] pt-14 sm:pt-20 pb-8">
      <div className="container-px grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 sm:gap-12">
        <div className="sm:col-span-2">
          <img src={asset('/brand/logo-mix-white.png')} alt="NEBULA" width={2795} height={2599} className="h-9 sm:h-10 w-auto mb-5" />
          <p className="text-titanium/50 text-sm max-w-xs leading-relaxed">
            Produtora audiovisual especializada em fotografia editorial e vídeo
            cinematográfico. Capturamos histórias, não apenas momentos.
          </p>
          <a
            href={CONTACT.instagram}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 mt-5 text-titanium/40 hover:text-titanium/70 transition-colors text-xs"
          >
            <InstagramIcon size={14} />
            {CONTACT.instagramHandle}
          </a>
        </div>

        <div>
          <h4 className="label-sm mb-5">Navegação</h4>
          <ul className="flex flex-col gap-0.5 text-sm">
            {NAV.map((n) => (
              <li key={n.to}>
                <Link
                  to={n.to}
                  className="inline-block py-1.5 text-titanium/60 hover:text-titanium transition-colors"
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="label-sm mb-5">Contacto</h4>
          <ul className="flex flex-col gap-0.5 text-sm">
            <li>
              {/*
                `break-all` porque o endereço não tem espaços: na coluna estreita
                do rodapé (4 colunas a partir de md) não cabia inteiro e alargava
                a página, dando scroll horizontal em ecrãs de tablet.
              */}
              <a
                href={`mailto:${CONTACT.email}`}
                className="flex items-start gap-2 py-1.5 text-titanium/60 hover:text-titanium transition-colors break-all"
              >
                <Mail size={14} className="shrink-0 mt-1" />
                {CONTACT.email}
              </a>
            </li>
            <li>
              <a
                href={CONTACT.instagramDm}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 py-1.5 text-titanium/60 hover:text-titanium transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <circle cx="12" cy="12" r="4"/>
                  <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/>
                </svg>
                DM no Instagram
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="container-px mt-12 pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row justify-between gap-2 text-xs text-titanium/30">
        <span>&copy; {new Date().getFullYear()} NEBULA. Todos os direitos reservados.</span>
        <span>Fotografia &amp; Vídeo Cinematográfico · Lisboa & Portalegre</span>
      </div>
    </footer>
  )
}
