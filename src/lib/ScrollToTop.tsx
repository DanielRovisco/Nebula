import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { grupoDeRota } from './i18n'

/**
 * Cada página começa no topo, como se tivesse sido aberta de novo.
 *
 * Os serviços são a excepção: os quatro vivem na mesma página e trocam-se por
 * abas que por acaso são ligações. Saltar para o topo aí levava a página para
 * cima debaixo do dedo de quem só queria ver o serviço ao lado, e é por isso
 * que se comparam grupos e não caminhos (ver `grupoDeRota`). Quem entra nos
 * serviços vindo de outra página muda de grupo, e sobe na mesma.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation()
  const grupo = grupoDeRota(pathname)
  const anterior = useRef(grupo)
  useEffect(() => {
    if (anterior.current === grupo) return
    anterior.current = grupo
    window.scrollTo(0, 0)
  }, [grupo])
  return null
}
