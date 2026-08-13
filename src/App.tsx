import { Suspense, lazy } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ScrollProgress from './components/ScrollProgress'
import FloatingActions from './components/FloatingActions'
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

export default function App() {
  const location = useLocation()

  return (
    <SmoothScroll>
      <ScrollProgress />
      <ScrollToTop />
      <Navbar />
      <AnimatePresence mode="wait">
        <PageTransition key={location.pathname}>
          <main>
            {/* min-h evita o Footer saltar para cima enquanto o chunk carrega. */}
            <Suspense fallback={<div className="min-h-screen" />}>
              <Routes location={location}>
                <Route path="/" element={<Home />} />
                <Route path="/sobre" element={<About />} />
                <Route path="/servicos" element={<Services />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/contacto" element={<Contact />} />
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
