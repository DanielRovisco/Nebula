import { useEffect } from 'react'

/**
 * Estatísticas de visitas, sem cookies.
 *
 * Não vem nada ligado de origem: sem `VITE_ANALYTICS_SRC` definido no build,
 * este componente não carrega script nenhum e o site não faz um único pedido a
 * terceiros. Serve tanto o Plausible (que usa `data-domain`) como o Umami (que
 * usa `data-website-id`) — define-se o que o serviço escolhido pedir.
 *
 * É de propósito que só funciona com ferramentas sem cookies: sem cookies não
 * há consentimento a pedir, e o site não precisa daquele aviso que toda a gente
 * fecha sem ler. Se algum dia entrar aqui o Google Analytics, passa a ser
 * preciso um banner a sério — e a política de privacidade tem de mudar.
 */
const SRC = import.meta.env.VITE_ANALYTICS_SRC as string | undefined
const DOMAIN = import.meta.env.VITE_ANALYTICS_DOMAIN as string | undefined
const ID = import.meta.env.VITE_ANALYTICS_ID as string | undefined

export default function Analytics() {
  useEffect(() => {
    // Em desenvolvimento não se conta nada: as nossas visitas não são visitas.
    if (!SRC || !import.meta.env.PROD) return
    if (document.querySelector(`script[src="${SRC}"]`)) return

    /*
      O painel de administração fica de fora pela mesma razão: somos nós que lá
      entramos, todos os dias, e por vezes dezenas de vezes seguidas a
      organizar uma galeria. Contar isso não diz nada sobre quem procura um
      fotógrafo — só enche o gráfico e faz o site parecer mais visitado do que
      é, que é a pior coisa que um número pode fazer.
    */
    if (window.location.pathname.replace(/\/$/, '').endsWith('/admin') ||
        window.location.pathname.includes('/admin/')) return

    const s = document.createElement('script')
    s.src = SRC
    s.defer = true
    if (DOMAIN) s.dataset.domain = DOMAIN
    if (ID) s.dataset.websiteId = ID
    document.head.appendChild(s)
  }, [])

  return null
}
