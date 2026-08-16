import { Suspense, lazy } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ScrollProgress from './components/ScrollProgress'
import FloatingActions from './components/FloatingActions'
import Analytics from './lib/Analytics'
import SmoothScroll from './lib/SmoothScroll'
import PageTransition from './lib/PageTransition'
import ScrollToTop from './lib/ScrollToTop'
import Home from './pages/Home'

// A Home fica no bundle inicial (é a entrada da maioria das visitas); as
// restantes rotas são chunks separados, carregados quando alguém navega.
const About = lazy(() => import('./pages/About'))
const Services = lazy(() => import('./pages/Services'))
const Portfolio = lazy(() => import('./pages/Portfolio'))
const Contact = lazy(() => import('./pages/Contact'))
const GalleryAccess = lazy(() => import('./pages/GalleryAccess'))
const GalleryView = lazy(() => import('./pages/GalleryView'))
const Privacy = lazy(() => import('./pages/Privacy'))
const NotFound = lazy(() => import('./pages/NotFound'))

// O painel e o cliente de Supabase só são descarregados por quem lá vai —
// não pesam na visita normal ao site.
const AdminShell = lazy(() => import('./pages/admin/AdminShell'))
const GalleryList = lazy(() => import('./pages/admin/GalleryList'))
const GalleryEditor = lazy(() => import('./pages/admin/GalleryEditor'))
const SiteAdmin = lazy(() => import('./pages/admin/SiteAdmin'))

const Loading = () => <div className="min-h-screen" />

export default function App() {
  const location = useLocation()

  // O painel é uma aplicação à parte: sem navegação do site, sem rodapé, sem
  // scroll suave. Não há nenhum link para aqui a partir do site.
  if (location.pathname.startsWith('/admin')) {
    return (
      <Suspense fallback={<Loading />}>
        <ScrollToTop />
        <AdminShell>
          <Routes>
            <Route path="/admin" element={<GalleryList />} />
            <Route path="/admin/site" element={<SiteAdmin />} />
            <Route path="/admin/:id" element={<GalleryEditor />} />
          </Routes>
        </AdminShell>
      </Suspense>
    )
  }

  // A galeria aberta também corre sem a navegação do site: a capa tem o seu
  // próprio logo centrado, e ter a navbar por cima punha dois logos NEBULA no
  // mesmo ecrã. O cliente está na entrega dele, não a navegar o site — o
  // caminho de volta é o link no fim da galeria.
  if (/^\/galeria\/[^/]+\/ver$/.test(location.pathname)) {
    return (
      <Suspense fallback={<Loading />}>
        <ScrollToTop />
        <Routes>
          <Route path="/galeria/:slug/ver" element={<GalleryView />} />
        </Routes>
      </Suspense>
    )
  }

  return (
    <SmoothScroll>
      {/* Fora do painel e das galerias: não se medem visitas a páginas privadas. */}
      <Analytics />
      <ScrollProgress />
      <ScrollToTop />
      <Navbar />
      <AnimatePresence mode="wait">
        <PageTransition key={location.pathname}>
          <main>
            {/* min-h evita o Footer saltar para cima enquanto o chunk carrega. */}
            <Suspense fallback={<Loading />}>
              <Routes location={location}>
                <Route path="/" element={<Home />} />
                <Route path="/sobre" element={<About />} />
                <Route path="/servicos" element={<Services />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/contacto" element={<Contact />} />
                <Route path="/galeria" element={<GalleryAccess />} />
                <Route path="/galeria/:slug" element={<GalleryAccess />} />
                <Route path="/galeria/:slug/ver" element={<GalleryView />} />
                <Route path="/privacidade" element={<Privacy />} />
                {/* Qualquer outro caminho — inclui os que chegam pelo 404.html
                    do GitHub Pages, que reencaminha para dentro da aplicação. */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </main>
        </PageTransition>
      </AnimatePresence>
      <Footer />
      <FloatingActions />
    </SmoothScroll>
  )
}
