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
import About from './pages/About'
import Services from './pages/Services'
import Portfolio from './pages/Portfolio'
import Contact from './pages/Contact'

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
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/sobre" element={<About />} />
              <Route path="/servicos" element={<Services />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/contacto" element={<Contact />} />
            </Routes>
          </main>
        </PageTransition>
      </AnimatePresence>
      <Footer />
      <FloatingActions />
    </SmoothScroll>
  )
}
