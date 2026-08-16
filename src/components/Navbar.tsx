import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { asset } from '../lib/asset'
import { CONTACT } from '../lib/site'
import { useLang, useLink, useT } from '../lib/i18n'
import { track } from '../lib/track'
import { switchLang } from '../lib/i18n/routes'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const t = useT()
  const link = useLink()
  const lang = useLang()
  const { pathname } = useLocation()

  const LINKS = [
    { to: link('home'), label: t.nav.home },
    { to: link('about'), label: t.nav.about },
    { to: link('services'), label: t.nav.services },
    { to: link('portfolio'), label: t.nav.portfolio },
    { to: link('gallery'), label: t.nav.gallery },
  ]
  const homePath = link('home')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? 'bg-eerie/88 backdrop-blur-md border-b border-white/[0.08]' : 'bg-transparent'
        }`}
      >
        <div className="container-px flex items-center justify-between py-5 sm:py-5">
          <Link to={homePath} className="flex items-center z-50 relative" onClick={() => setOpen(false)}>
            <img
              src={asset('/brand/logo-lettering-white.png')}
              alt="NEBULA"
              width={2795}
              height={577}
              className="h-7 sm:h-8 w-auto logo-hover"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === homePath}
                className={({ isActive }) =>
                  `relative text-[11px] uppercase tracking-[0.18em] transition-colors py-1 group ${
                    isActive ? 'text-titanium' : 'text-titanium/60 hover:text-titanium'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {link.label}
                    <span
                      className={`absolute left-0 -bottom-0.5 h-px bg-titanium/60 transition-all duration-300 ${
                        isActive ? 'w-full' : 'w-0 group-hover:w-full'
                      }`}
                    />
                  </>
                )}
              </NavLink>
            ))}
            <Link
              to={link('contact')}
              onClick={() => track('cta_marcar_sessao', { onde: 'navbar' })}
              className="ml-2 px-5 py-2.5 rounded-full border border-titanium/25 text-[11px] uppercase tracking-[0.18em] text-titanium/75 hover:bg-titanium hover:text-eerie hover:border-titanium transition-all duration-300 active:scale-95"
            >
              {t.nav.cta}
            </Link>

            {/*
              Seletor de idioma: leva à mesma página na outra língua, não à
              inicial — quem está nos serviços em português quer os serviços em
              inglês. `reloadDocument` fica de fora de propósito: é navegação
              normal da aplicação.
            */}
            <Link
              to={switchLang(pathname, lang === 'pt' ? 'en' : 'pt')}
              aria-label={t.nav.langLabel}
              className="text-[11px] uppercase tracking-[0.18em] text-titanium/45 hover:text-titanium transition-colors py-1"
            >
              {lang === 'pt' ? 'EN' : 'PT'}
            </Link>
          </nav>

          {/* Mobile hamburger */}
          <button
            className="md:hidden relative z-50 text-titanium -mr-2 p-3 active:scale-90 transition-transform"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
          >
            <AnimatePresence mode="wait">
              {open ? (
                <motion.span key="x" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <X size={24} />
                </motion.span>
              ) : (
                <motion.span key="menu" initial={{ opacity: 0, rotate: 90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Menu size={24} />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </header>

      {/*
        O overlay vive FORA do <header> de propósito. Com scroll o header ganha
        `backdrop-blur-md`, e um backdrop-filter cria um containing block para
        descendentes `position: fixed` — lá dentro, `fixed inset-0` passava a
        medir-se contra a barra (~68px) em vez do viewport, o que tirava o fundo
        e cortava o texto do menu.
      */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ clipPath: 'circle(0% at calc(100% - 2rem) 2.5rem)' }}
            animate={{ clipPath: 'circle(160% at calc(100% - 2rem) 2.5rem)' }}
            exit={{ clipPath: 'circle(0% at calc(100% - 2rem) 2.5rem)' }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden fixed inset-0 z-40 bg-eerie flex flex-col items-center justify-center gap-2"
          >
            {[...LINKS, { to: link('contact'), label: t.nav.contact }].map((link, i) => (
              <motion.div
                key={link.to}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 + i * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <NavLink
                  to={link.to}
                  end={link.to === homePath}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `block py-3 px-4 text-3xl sm:text-4xl font-semibold tracking-tight active:opacity-50 ${
                      isActive ? 'text-titanium' : 'text-titanium/55'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-8 flex flex-col items-center gap-4"
            >
              <Link
                to={switchLang(pathname, lang === 'pt' ? 'en' : 'pt')}
                onClick={() => setOpen(false)}
                className="text-[11px] uppercase tracking-[0.2em] text-titanium/45"
              >
                {lang === 'pt' ? 'English' : 'Português'}
              </Link>
              <a
                href={CONTACT.instagramDm}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-2.5 border border-white/20 px-6 py-3 rounded-full text-[11px] uppercase tracking-[0.2em] text-titanium/60"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <circle cx="12" cy="12" r="4"/>
                  <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/>
                </svg>
                Instagram
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
