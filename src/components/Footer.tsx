import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import InstagramIcon from '../lib/InstagramIcon'
import { asset } from '../lib/asset'
import { CONTACT } from '../lib/site'
import { useLink, useT } from '../lib/i18n'

export default function Footer() {
  const t = useT()
  const link = useLink()

  const NAV = [
    { to: link('about'), label: t.nav.about },
    { to: link('services'), label: t.nav.services },
    { to: link('portfolio'), label: t.nav.portfolio },
    { to: link('contact'), label: t.nav.contact },
    { to: link('gallery'), label: t.nav.gallery },
  ]

  return (
    <footer className="bg-eerie border-t border-white/[0.08] pt-14 sm:pt-20 pb-8">
      <div className="container-px grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 sm:gap-12">
        <div className="sm:col-span-2">
          <img src={asset('/brand/logo-mix-white.png')} alt="NEBULA" width={2795} height={2599} className="h-9 sm:h-10 w-auto mb-5" />
          <p className="text-titanium/50 text-sm max-w-xs leading-relaxed">
            {t.footer.tagline}
          </p>
          <a
            href={CONTACT.instagram}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 mt-5 text-titanium/55 hover:text-titanium/70 transition-colors text-xs"
          >
            <InstagramIcon size={14} />
            {CONTACT.instagramHandle}
          </a>
        </div>

        <div>
          <h2 className="label-sm mb-5">{t.footer.navLabel}</h2>
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
          <h2 className="label-sm mb-5">{t.footer.contactLabel}</h2>
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
                {t.contact.instagramDm}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="container-px mt-12 pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row justify-between gap-2 text-xs text-titanium/55">
        <span>&copy; {new Date().getFullYear()} NEBULA. {t.footer.rights}</span>
        <div className="flex items-center gap-4">
          <Link to={link('privacy')} className="hover:text-titanium/60 transition-colors">
            {t.footer.privacy}
          </Link>
          <span>{t.footer.trade}</span>
        </div>
      </div>
    </footer>
  )
}
