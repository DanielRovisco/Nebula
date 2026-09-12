import { Suspense } from 'react'
import { lazyComRecarga } from './lib/lazyComRecarga'
import Rede from './components/Rede'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ScrollProgress from './components/ScrollProgress'
import FloatingActions from './components/FloatingActions'
import Analytics from './lib/Analytics'
import Poeira from './lib/Poeira'
import SmoothScroll from './lib/SmoothScroll'
import PageTransition from './lib/PageTransition'
import ScrollToTop from './lib/ScrollToTop'
import Home from './pages/Home'
import { grupoDeRota } from './lib/i18n'

// A Home fica no bundle inicial (é a entrada da maioria das visitas); as
// restantes rotas são chunks separados, carregados quando alguém navega.
const About = lazyComRecarga(() => import('./pages/About'))
const Services = lazyComRecarga(() => import('./pages/Services'))
const Portfolio = lazyComRecarga(() => import('./pages/Portfolio'))
const Contact = lazyComRecarga(() => import('./pages/Contact'))
const GalleryAccess = lazyComRecarga(() => import('./pages/GalleryAccess'))
const GalleryView = lazyComRecarga(() => import('./pages/GalleryView'))
const Privacy = lazyComRecarga(() => import('./pages/Privacy'))
const NotFound = lazyComRecarga(() => import('./pages/NotFound'))
const Thanks = lazyComRecarga(() => import('./pages/Thanks'))

// A página do convidado do casamento. Vive fora do site: quem lá chega vem de
// um QR code numa mesa, não de uma visita ao portefólio.
const EventoPage = lazyComRecarga(() => import('./pages/evento/EventoPage'))

// O painel dos noivos. Também fora do site, e pela mesma razão: é a página do
// casamento deles, não uma secção do nosso portefólio.
const PainelNoivos = lazyComRecarga(() => import('./pages/evento/noivos/PainelNoivos'))

// O painel e o cliente de Supabase só são descarregados por quem lá vai —
// não pesam na visita normal ao site.
const AdminShell = lazyComRecarga(() => import('./pages/admin/AdminShell'))
const GalleryList = lazyComRecarga(() => import('./pages/admin/GalleryList'))
const GalleryEditor = lazyComRecarga(() => import('./pages/admin/GalleryEditor'))
const SiteAdmin = lazyComRecarga(() => import('./pages/admin/SiteAdmin'))
const EventList = lazyComRecarga(() => import('./pages/admin/EventList'))
const EventEditor = lazyComRecarga(() => import('./pages/admin/EventEditor'))

const Loading = () => <div className="min-h-screen" />

export default function App() {
  const location = useLocation()

  // O painel é uma aplicação à parte: sem navegação do site, sem rodapé, sem
  // scroll suave. Não há nenhum link para aqui a partir do site.
  if (location.pathname.startsWith('/admin')) {
    return (
      <Rede><Suspense fallback={<Loading />}>
        <ScrollToTop />
        <AdminShell>
          <Routes>
            <Route path="/admin" element={<GalleryList />} />
            <Route path="/admin/site" element={<SiteAdmin />} />
            <Route path="/admin/eventos" element={<EventList />} />
            <Route path="/admin/eventos/:id" element={<EventEditor />} />
            <Route path="/admin/:id" element={<GalleryEditor />} />
          </Routes>
        </AdminShell>
      </Suspense></Rede>
    )
  }

  // A galeria aberta também corre sem a navegação do site: a capa tem o seu
  // próprio logo centrado, e ter a navbar por cima punha dois logos NEBULA no
  // mesmo ecrã. O cliente está na entrega dele, não a navegar o site — o
  // caminho de volta é o link no fim da galeria.
  /*
    A página do evento corre sozinha, pela mesma razão que a galeria: quem lá
    está veio de um código QR numa mesa de casamento, para deixar fotografias, e
    a navegação do site só lhe daria maneiras de sair de onde queria estar.
  */
  if (/^\/(e|casamento)\/[^/]+$/.test(location.pathname)) {
    return (
      <Rede><Suspense fallback={<Loading />}>
        <ScrollToTop />
        <Routes>
          <Route path="/e/:slug" element={<EventoPage />} />
          <Route path="/casamento/:slug" element={<PainelNoivos />} />
        </Routes>
      </Suspense></Rede>
    )
  }

  if (/^\/(galeria\/[^/]+\/ver|en\/gallery\/[^/]+\/view)$/.test(location.pathname)) {
    return (
      <Rede><Suspense fallback={<Loading />}>
        <ScrollToTop />
        <Routes>
          <Route path="/galeria/:slug/ver" element={<GalleryView />} />
          <Route path="/en/gallery/:slug/view" element={<GalleryView />} />
        </Routes>
      </Suspense></Rede>
    )
  }

  return (
    <SmoothScroll>
      {/* Fora do painel e das galerias: não se medem visitas a páginas privadas. */}
      <Poeira />
      <Analytics />
      <ScrollProgress />
      <ScrollToTop />
      <Navbar />
      <AnimatePresence mode="wait">
        {/*
          Os quatro serviços partilham a mesma chave de transição.

          Com a chave no caminho inteiro, passar de um serviço para o outro
          desmontava a página e voltava a montá-la com o fundido de entrada —
          clicar numa aba parecia carregar a página toda outra vez, que é
          precisamente o que ter abas evita. Com a chave comum, a transição
          fica para quem entra e sai dos serviços, e lá dentro troca-se só o
          conteúdo do painel.
        */}
        <PageTransition key={grupoDeRota(location.pathname)}>
          <main>
            {/* min-h evita o Footer saltar para cima enquanto o chunk carrega. */}
            <Rede><Suspense fallback={<Loading />}>
              <Routes location={location}>
                {/*
                  As mesmas páginas em dois endereços — um por língua. A língua
                  sai do endereço (ver lib/i18n), por isso não há aqui estado
                  nenhum a passar: cada página lê a sua a partir do sítio onde
                  está. É o que permite partilhar um link inglês e ele abrir em
                  inglês, e o Google indexar as duas versões.
                */}
                <Route path="/" element={<Home />} />
                <Route path="/en" element={<Home />} />
                <Route path="/sobre" element={<About />} />
                <Route path="/en/about" element={<About />} />
                <Route path="/servicos" element={<Services />} />
                {/*
                  Cada serviço no seu endereço. É a mesma página: troca-se o
                  que está no painel sem recarregar nada, e o endereço é o que
                  diz qual deles está aberto (ver pages/Services).
                */}
                <Route path="/servicos/:servico" element={<Services />} />
                <Route path="/en/services" element={<Services />} />
                <Route path="/en/services/:servico" element={<Services />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/en/portfolio" element={<Portfolio />} />
                <Route path="/contacto" element={<Contact />} />
                <Route path="/en/contact" element={<Contact />} />
                <Route path="/galeria" element={<GalleryAccess />} />
                <Route path="/galeria/:slug" element={<GalleryAccess />} />
                <Route path="/galeria/:slug/ver" element={<GalleryView />} />
                <Route path="/en/gallery" element={<GalleryAccess />} />
                <Route path="/en/gallery/:slug" element={<GalleryAccess />} />
                <Route path="/en/gallery/:slug/view" element={<GalleryView />} />
                <Route path="/privacidade" element={<Privacy />} />
                <Route path="/en/privacy" element={<Privacy />} />
                <Route path="/obrigado" element={<Thanks />} />
                <Route path="/en/thank-you" element={<Thanks />} />
                {/* Qualquer outro caminho — inclui os que chegam pelo 404.html
                    do GitHub Pages, que reencaminha para dentro da aplicação. */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense></Rede>
          </main>
        </PageTransition>
      </AnimatePresence>
      <Footer />
      <FloatingActions />
    </SmoothScroll>
  )
}
