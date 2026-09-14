import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import Seo from '../../lib/Seo'
import { asset } from '../../lib/asset'
import { ErroMostra, lerMostra, type FotoPublica, type PaginaMostra } from '../../lib/impressao/publica'
import Foto from './Foto'
import Visor from './Visor'

/**
 * A mostra da estação de impressão, vista por quem está na festa.
 *
 * Chega-se aqui por um código QR em cima de uma mesa, em pé, com um copo na
 * mão, numa rede partilhada por duzentas pessoas. Toda a página é desenhada
 * para essa situação: não há registo, não há password, não há passo nenhum
 * antes de ver, as imagens são pequenas e entram às páginas, e a única coisa
 * que se pede a quem chega é que leia um número.
 *
 * O que esta página não tem é tão importante como o que tem. Não carrega
 * fotografias, não as descarrega, não as partilha e não guarda nada de
 * ninguém. Cada uma dessas coisas é uma coisa a menos que pode correr mal em
 * cima de uma mesa a meio de um casamento.
 */

/*
  De vinte e cinco em vinte e cinco segundos, à procura de fotografias novas.

  É uma mesa ao vivo: quem acabou de ser fotografado vai olhar para o telemóvel
  nos dois minutos seguintes, e obrigá-lo a recarregar a página à mão era
  garantir que metade das pessoas achava que não tinha funcionado. Só quando a
  página está à vista, para não gastar bateria e rede no bolso de ninguém.
*/
const INTERVALO = 25000

export default function MostraPage() {
  const { slug = '' } = useParams()
  const reduzido = useReducedMotion()

  const [nome, setNome] = useState<string | null>(null)
  const [terminada, setTerminada] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [fotos, setFotos] = useState<FotoPublica[]>([])
  const [proximo, setProximo] = useState<number | null>(null)
  const [aCarregar, setACarregar] = useState(false)
  const [aberta, setAberta] = useState<FotoPublica | null>(null)

  /*
    Tapa as fotografias enquanto a página não está à vista.

    Vale o que vale, e convém dizer o que é: não impede uma captura de ecrã,
    porque nenhum browser avisa que ela vai acontecer. O que apanha é o retrato
    que o telemóvel tira da página ao trocar de aplicação, e as gravações de
    ecrã que passam por segundo plano. É um travão pequeno num sítio onde não
    existe travão grande.
  */
  const [tapado, setTapado] = useState(false)
  useEffect(() => {
    const ver = () => setTapado(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', ver)
    return () => document.removeEventListener('visibilitychange', ver)
  }, [])

  const primeira = useRef(true)

  /*
    Junta uma página de resposta ao que já está no ecrã.

    Função à parte, e sem `async`, porque quem a chama é sempre o `.then` de um
    pedido: o estado muda quando a resposta chega, e não a meio de um efeito a
    correr.
  */
  const aplicar = useCallback((p: PaginaMostra, antes: number | null) => {
    setNome(p.name)
    setTerminada(p.terminada)
    setErro(null)
    if (antes === null) {
      /*
        Página um: junta as novas por cima sem mexer no que já está.

        Substituir a lista toda parece mais simples e é pior: as imagens já
        carregadas voltavam a pedir-se com URLs assinados novos, e num telemóvel
        a meio de uma festa isso é a grelha inteira a piscar de vinte e cinco em
        vinte e cinco segundos.
      */
      setFotos((antigas) => {
        if (!antigas.length) return p.fotos
        const tenho = new Set(antigas.map((f) => f.numero))
        const novas = p.fotos.filter((f) => !tenho.has(f.numero))
        return novas.length ? [...novas, ...antigas] : antigas
      })
      if (primeira.current) {
        setProximo(p.proximo)
        primeira.current = false
      }
    } else {
      setFotos((antigas) => {
        const tenho = new Set(antigas.map((f) => f.numero))
        return [...antigas, ...p.fotos.filter((f) => !tenho.has(f.numero))]
      })
      setProximo(p.proximo)
    }
  }, [])

  const falhou = useCallback((e: unknown) => {
    const err = e as ErroMostra
    // Uma falha de rede não apaga o que já está no ecrã: numa festa a rede vai
    // e vem, e limpar a grelha a cada falha seria insuportável.
    if (err.codigo === 'nao_encontrado') setErro('nao_encontrado')
    else setErro((antes) => antes ?? 'sem_rede')
  }, [])

  useEffect(() => {
    let vivo = true
    lerMostra(slug, null)
      .then((p) => { if (vivo) aplicar(p, null) })
      .catch((e) => { if (vivo) falhou(e) })
    return () => { vivo = false }
  }, [slug, aplicar, falhou])

  useEffect(() => {
    if (terminada || erro === 'nao_encontrado') return
    let vivo = true
    const pedir = () => {
      lerMostra(slug, null)
        .then((p) => { if (vivo) aplicar(p, null) })
        .catch(() => { /* fica o que está no ecrã até à próxima tentativa */ })
    }
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') pedir()
    }, INTERVALO)
    // A rede voltou: pede já, em vez de esperar pelo próximo quarto de minuto.
    window.addEventListener('online', pedir)
    return () => {
      vivo = false
      clearInterval(t)
      window.removeEventListener('online', pedir)
    }
  }, [slug, aplicar, terminada, erro])

  function mais() {
    if (!proximo || aCarregar) return
    setACarregar(true)
    lerMostra(slug, proximo)
      .then((p) => aplicar(p, proximo))
      .catch(falhou)
      .finally(() => setACarregar(false))
  }

  const entra = (i: number) =>
    reduzido
      ? {}
      : {
          initial: { opacity: 0, scale: 0.94 },
          animate: { opacity: 1, scale: 1 },
          transition: { duration: 0.5, delay: Math.min(i, 8) * 0.04, ease: [0.16, 1, 0.3, 1] as const },
        }

  return (
    <div className="mostra-raiz min-h-screen bg-eerie">
      <Seo
        title={nome ? `${nome} | NEBULA` : 'NEBULA'}
        description="Fotografias da noite, para escolher na mesa de impressão."
        // Nunca indexada: é uma página de uma noite, com fotografias de pessoas
        // que não pediram para aparecer numa pesquisa.
        noindex
      />

      {/*
        O que sai se alguém mandar imprimir a página, em vez da folha de
        fotografias que sairia. Não está escondido por vaidade: é a única
        proteção desta página que funciona mesmo, porque o browser diz-nos que
        vai imprimir. A captura de ecrã não avisa ninguém.
      */}
      <div className="so-impressao hidden flex-col items-center justify-center gap-6 min-h-screen bg-black text-white">
        <img src={asset('brand/logo-mix-white.png')} alt="NEBULA" className="h-20 w-auto" />
        <p className="text-sm">As fotografias imprimem-se na mesa, não aqui.</p>
      </div>

      <div className="sem-impressao">
        <header className="px-6 pt-12 pb-8 text-center">
          <img
            src={asset('brand/logo-symbol-white.png')}
            alt=""
            aria-hidden
            width={1252}
            height={1494}
            className="h-9 w-auto mx-auto mb-6 opacity-50"
          />
          <h1 className="font-serif leading-[1.05]" style={{ fontSize: 'clamp(1.9rem, 7vw, 3rem)' }}>
            {nome ?? 'Mostra'}
          </h1>
          {!terminada && !erro && (
            <p className="mt-4 text-sm text-titanium/50 leading-relaxed max-w-xs mx-auto text-balance">
              Encontra a tua, guarda o número e diz na mesa. Nós imprimimos.
            </p>
          )}
        </header>

        <main className="px-3 pb-24">
          {erro === 'nao_encontrado' && (
            <p className="text-center text-titanium/55 py-16 px-6 leading-relaxed">
              Esta mostra não existe. Confirma o código na mesa.
            </p>
          )}

          {erro === 'sem_rede' && (
            <div className="text-center py-16 px-6">
              <p className="text-titanium/55 leading-relaxed">
                Sem rede neste momento. Fica por aqui, que assim que voltar aparece sozinho.
              </p>
            </div>
          )}

          {terminada && (
            <p className="text-center text-titanium/55 py-16 px-6 leading-relaxed max-w-sm mx-auto">
              Esta mostra já terminou. As fotografias da noite ficam com os noivos.
            </p>
          )}

          {!terminada && !erro && !fotos.length && (
            <p className="text-center text-titanium/40 py-16 px-6 leading-relaxed">
              Ainda não há nada aqui. As primeiras aparecem daqui a pouco.
            </p>
          )}

          {!terminada && fotos.length > 0 && (
            <>
              {/*
                Três colunas no telemóvel. Com duas, cada miniatura era grande
                de mais e via-se meia dúzia de cada vez numa mesa que produz
                centenas; com quatro, o número queimado na fotografia deixava
                de se ler, que é a única coisa que aqui não pode falhar.
              */}
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 max-w-4xl mx-auto">
                {fotos.map((f, i) => (
                  <motion.button
                    key={f.numero}
                    {...entra(i)}
                    onClick={() => setAberta(f)}
                    aria-label={`Ver a fotografia ${f.numero} em grande`}
                    className="relative block aspect-square overflow-hidden rounded-md active:scale-[0.97] transition-transform"
                  >
                    <Foto
                      src={f.thumbUrl}
                      numero={f.numero}
                      tapado={tapado}
                      className="absolute inset-0"
                    />
                    {/*
                      O número outra vez, desenhado pela página por cima da
                      miniatura.

                      Está queimado na imagem, mas na grelha a imagem é cortada
                      a quadrado e o canto onde ele vive é a primeira coisa que
                      se perde: numa fotografia ao alto some-se o rodapé, numa
                      deitada somem-se os lados. E o número é a única coisa
                      desta página que não pode falhar, porque é o que a pessoa
                      diz na mesa. O queimado continua a servir para o que
                      serve: sobreviver a uma captura de ecrã.
                    */}
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-black/65 text-[10px] font-semibold tabular-nums text-titanium/95">
                      {String(f.numero).padStart(3, '0')}
                    </span>
                  </motion.button>
                ))}
              </div>

              {proximo && (
                <div className="text-center mt-8">
                  <button
                    onClick={mais}
                    disabled={aCarregar}
                    className="inline-flex items-center gap-2 border border-white/15 rounded-full px-7 py-4 text-[11px] uppercase tracking-[0.18em] text-titanium/70 active:scale-95 transition-transform disabled:opacity-50"
                  >
                    {aCarregar ? 'A carregar…' : 'Ver as anteriores'}
                  </button>
                </div>
              )}

              <p className="text-center text-[11px] text-titanium/30 mt-10 px-6 leading-relaxed max-w-xs mx-auto">
                Estas são para escolher, não para guardar. As boas, em condições,
                ficam com os noivos.
              </p>
            </>
          )}
        </main>
      </div>

      <AnimatePresence>
        {aberta && <Visor foto={aberta} tapado={tapado} aoFechar={() => setAberta(null)} />}
      </AnimatePresence>
    </div>
  )
}
