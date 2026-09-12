import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Check } from 'lucide-react'
import Reveal from '../lib/Reveal'
import Picture from '../lib/Picture'
import Telemovel from '../components/servicos/Telemovel'
import EcraGaleria from '../components/servicos/EcraGaleria'
import EcraConvidados from '../components/servicos/EcraConvidados'
import { CAPAS_LOCAIS } from '../lib/servicosCapas'
import { publicUrl } from '../lib/site-content/public'
import { useServiceCovers } from '../lib/site-content/useSiteContent'
import Seo from '../lib/Seo'
import { SITE_URL, absoluteUrl } from '../lib/site'
import { useLang, useLink, useT } from '../lib/i18n'
import { servicoDoSlug, servicoPath, type ServicoId } from '../lib/i18n/routes'
import Breadcrumbs from '../components/Breadcrumbs'
import { breadcrumbJsonLd } from '../lib/breadcrumbJsonLd'

/**
 * Quantas colunas para os cartões que existem.
 *
 * Recebe um `number` e não o comprimento literal de propósito: com os tipos
 * estreitados pelo `as const`, o compilador sabia que nenhuma categoria tinha
 * dois packs e marcava essa comparação como morta. Ela não está morta, está à
 * espera de os eventos terem packs a sério.
 *
 * Um cartão sozinho não se estica ao ecrã todo: uma linha de texto com mil
 * pixels de largura não se lê, e um cartão vazio à direita parece uma coisa que
 * não carregou.
 */
const colunas = (quantos: number) =>
  quantos === 1
    ? 'sm:max-w-md'
    : quantos === 2
      ? 'sm:grid-cols-2'
      : 'sm:grid-cols-2 lg:grid-cols-3'

/**
 * A estrutura dos packs vive aqui; os nomes e os itens vêm do dicionário. Assim
 * acrescentar um item a um pack é uma linha em cada língua, e nunca fica um
 * pack meio traduzido.
 */
const CATEGORIES = [
  {
    id: 'casamentos',
    // Sem correspondência no portfólio: ainda não há fotografias de casamento.
    portfolio: null,
    /*
      Só os casamentos mostram a página dos convidados, e não é esquecimento
      nas outras: a galeria de convidados existe porque num casamento há cem
      pessoas com o telemóvel na mão. Numa sessão de maternidade há duas, e
      são as nossas clientes. Anunciar ali a mesma coisa seria vender um
      serviço que não faz sentido nenhum naquele contexto.
    */
    convidados: true,
    packs: [
      /*
        A ordem das linhas não é decorativa: primeiro o que se recebe (o
        trabalho, as horas, quantas fotografias), depois os extras. É por aí que
        os olhos passam, e é aí que se decide se vale o preço.
      */
      {
        name: 'essencia',
        items: ['photoEditorial', 'horas6', 'fotos200', 'privateGallery', 'sneakPeek'],
      },
      {
        name: 'origem',
        items: [
          'photoVideo4k', 'horas8', 'fotos300', 'team',
          'preWedding', 'guestGallery', 'privateGallery', 'sneakPeek',
        ],
      },
      /*
        O pack de topo mostra só o que acrescenta, e não a lista toda outra vez.

        Repetir as seis linhas do anterior mais uma nova obriga quem lê a
        comparar dois blocos quase iguais para descobrir onde está a diferença,
        e a maior parte das pessoas não o faz: desiste e fica pelo do meio.
        Dizer "tudo o que o Origem tem, e ainda" põe a diferença sozinha no
        ecrã, que é o único sítio onde ela pode ser vista.
      */
      {
        name: 'nebula',
        herda: 'origem',
        items: ['diaCompleto', 'fotosTodas', 'drone', 'verticalReels', 'entregaRapida'],
      },
    ],
  },
  {
    id: 'maternidade',
    portfolio: 'maternidade',
    /*
      Os mesmos três nomes dos casamentos, de propósito.

      Antes eram Essência, Cinema & Foto e Íntimo, e esses dois últimos liam-se
      como sabores ao lado um do outro e não como degraus. Quando não se percebe
      qual é o melhor, escolhe-se o mais barato. Com os nomes repetidos em todas
      as categorias, quem já viu os packs de casamento reconhece a escada sem a
      ter de ler outra vez.
    */
    packs: [
      { name: 'essencia', items: ['photoSession', 'sessao1h', 'fotos10', 'privateGallery'] },
      {
        name: 'origem',
        items: ['photoVideoLifestyle', 'sessao2h', 'fotos20', 'privateGallery', 'sneakPeek'],
      },
      {
        name: 'nebula',
        herda: 'origem',
        items: ['fotosTodas', 'verticalReels', 'entregaRapida'],
      },
    ],
  },
  {
    id: 'retratos',
    portfolio: 'retratos',
    /*
      Três degraus, com os mesmos nomes das outras categorias.

      O que separa um retrato do seguinte é tempo, roupas e o que se leva para
      casa. O vídeo vertical fica no topo de propósito: num retrato é isso que a
      pessoa quer publicar, e um retrato que também se mexe é a única coisa aqui
      que ninguém tem em duplicado no telemóvel.
    */
    /*
      Dois degraus e não três.

      Um retrato é um serviço simples: uma pessoa, uma sessão, uma entrega. Três
      níveis obrigavam a inventar uma diferença a meio que não existe, e um
      degrau inventado nota-se — faz o cliente desconfiar dos outros dois.

      O de cima chama-se Nebula e não Origem de propósito: em todas as
      categorias, Nebula quer dizer o mais completo que há. Retratos apenas não
      tem o degrau do meio.
    */
    packs: [
      {
        name: 'essencia',
        items: ['photoSession', 'sessao1h', 'localEscolha', 'fotos10', 'privateGallery'],
      },
      {
        name: 'nebula',
        herda: 'essencia',
        items: [
          'photoEditorial', 'sessao3h', 'fotos20Mais', 'preparacao',
          'sneakPeek', 'verticalReels', 'entregaRapida',
        ],
      },
    ],
  },
  {
    id: 'eventos',
    // Os trabalhos que ilustram este serviço vivem em "Retratos".
    portfolio: 'retratos',
    /*
      Um cartão só, e de propósito.

      Não se escrevem packs para um serviço que ainda não se fez. Um pack é uma
      promessa com número: horas, fotografias, prazos. Sem eventos feitos, esses
      números seriam inventados, e quem os descobre errado é o cliente no
      próprio dia.

      Quando houver eventos suficientes para saber quanto tempo levam e quantas
      fotografias saem, isto vira uma escada como as outras. Até lá, o convite
      honesto é falar.
    */
    packs: [
      {
        name: 'medida',
        items: ['eventoCobertura', 'eventoCombinado', 'privateGallery', 'sneakPeek'],
      },
    ],
  },
] as const

/** Só abrimos a categoria pedida se ela existir. O hash vem do URL. */
function categoriaDoHash(hash: string) {
  const id = decodeURIComponent(hash.replace('#', ''))
  return CATEGORIES.some((c) => c.id === id) ? (id as ServicoId) : null
}

/** Ponto de uma lista curta, com o visto que o resto da página usa. */
function Ponto({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm text-titanium/60">
      <Check size={14} className="mt-0.5 shrink-0 text-titanium/70" />
      {children}
    </li>
  )
}

export default function Services() {
  const t = useT()
  const link = useLink()
  const lang = useLang()
  const navigate = useNavigate()
  const reduzido = useReducedMotion()
  const { hash } = useLocation()
  const { servico } = useParams()
  // Capas escolhidas no painel. Serviço sem capa lá fica com a do repositório.
  const capas = useServiceCovers()

  /*
    O serviço escolhido vem do endereço, e não de um estado guardado aqui.

    É a diferença entre uma aba e uma página: assim cada serviço tem endereço
    próprio para partilhar, para indexar e para o botão de voltar entender, e
    continua a trocar-se sem recarregar nada.

    Sem serviço no endereço (alguém em /servicos) mostra-se o primeiro, e o
    canonical aponta para o endereço próprio dele. Duas páginas com o mesmo
    conteúdo a competir uma com a outra seria pior do que não ter nenhuma.
  */
  const doUrl = servicoDoSlug(servico, lang)
  const aberto: ServicoId = doUrl ?? 'casamentos'

  const barraRef = useRef<HTMLDivElement | null>(null)
  const abasRef = useRef<Record<string, HTMLAnchorElement | null>>({})

  /*
    A posição e a largura da aba escolhida, medidas do que está no ecrã.

    Era o framer-motion a tratar disto com `layoutId`, e o efeito era um salto:
    o realce vivia dentro de cada aba, e cada aba corta o que lhe sai fora, por
    isso ele desaparecia de um lado e reaparecia do outro. Agora é um elemento
    só, filho da barra, que viaja de uma posição para a outra e passa por cima
    das abas do meio pelo caminho.

    Medido em `useLayoutEffect` e não `useEffect`: entre pintar na posição
    antiga e corrigir para a certa há um fotograma, e esse fotograma vê-se.
  */
  const [marca, setMarca] = useState<{ x: number; w: number } | null>(null)
  useLayoutEffect(() => {
    const medir = () => {
      const el = abasRef.current[aberto]
      if (!el) return
      setMarca({ x: el.offsetLeft, w: el.offsetWidth })
    }
    medir()
    /*
      As letras mudam de largura quando a fonte verdadeira chega, e as abas
      mudam de tamanho com o ecrã. Sem voltar a medir nesses dois momentos, o
      realce fica ao lado da aba que devia estar a marcar.
    */
    const observador = new ResizeObserver(medir)
    if (barraRef.current) observador.observe(barraRef.current)
    document.fonts?.ready.then(medir).catch(() => {})
    return () => observador.disconnect()
  }, [aberto])

  /*
    Trocar de serviço não sobe a página ao topo (ver lib/ScrollToTop), mas se
    as abas já ficaram acima do ecrã, o conteúdo trocava sem se ver o que o
    trocou: parecia que a página tinha mudado sozinha. Nesse caso, e só nesse,
    trazem-se as abas de volta à vista, com os 96px de desconto da barra fixa.
  */
  useEffect(() => {
    const el = barraRef.current
    if (!el) return
    const topo = el.getBoundingClientRect().top
    if (topo >= 96) return
    window.scrollTo({ top: Math.max(0, topo + window.scrollY - 96), behavior: 'smooth' })
  }, [aberto])

  /*
    Endereços antigos com hash (/servicos#maternidade) ainda andam por aí: em
    ligações partilhadas, no histórico de quem já cá esteve, e possivelmente no
    índice do Google. Levam ao sítio certo, uma vez, sem entrada no histórico.
  */
  const doHash = servico ? null : categoriaDoHash(hash)
  if (doHash) return <Navigate to={servicoPath(doHash, lang)} replace />

  /*
    Um slug que não é serviço nenhum (/servicos/casamento, /servicos/qualquer)
    não pode ficar a mostrar casamentos num endereço inventado: seria uma
    página a existir em endereços infinitos. Volta à lista.
  */
  if (servico && !doUrl) return <Navigate to={link('services')} replace />

  const cat = CATEGORIES.find((c) => c.id === aberto)!
  const pagina = t.services.paginas[aberto]
  const capa = capas[aberto]
  const local = CAPAS_LOCAIS[aberto]

  /*
    Setas para mudar de aba, Home e End para a primeira e a última. É o que a
    norma manda para este padrão e é o que torna a barra utilizável sem rato:
    sem isto, e com uma só paragem de tabulação, quem navega por teclado
    chegava à barra e não conseguia sair da primeira aba.
  */
  function aoTeclado(e: React.KeyboardEvent<HTMLDivElement>) {
    const ids = CATEGORIES.map((c) => c.id) as ServicoId[]
    const i = ids.indexOf(aberto)
    let destino: ServicoId | null = null
    if (e.key === 'ArrowRight') destino = ids[(i + 1) % ids.length]
    else if (e.key === 'ArrowLeft') destino = ids[(i - 1 + ids.length) % ids.length]
    else if (e.key === 'Home') destino = ids[0]
    else if (e.key === 'End') destino = ids[ids.length - 1]
    if (!destino) return
    e.preventDefault()
    /*
      Navegar e não trocar estado: a barra é feita de ligações, e a seta tem de
      fazer o mesmo que o clique faria. `replace` para as setas não encherem o
      histórico.
    */
    navigate(servicoPath(destino, lang), { replace: true })
    abasRef.current[destino]?.focus()
  }

  /*
    A viagem do realce de uma aba para a outra.

    Uma mola e não uma duração fixa: com duração fixa, ir da primeira à última
    demora o mesmo que ir da primeira à segunda, e a viagem longa fica lenta e
    a curta fica brusca. A mola resolve isso sozinha, e o `damping` alto tira a
    oscilação no fim, que aqui pareceria um defeito e não um movimento.
  */
  const viagem = { type: 'spring' as const, stiffness: 130, damping: 24, mass: 1 }

  return (
    <div className="pt-24 sm:pt-28 lg:pt-24 pb-16 sm:pb-24">
      {/*
        O título e a descrição são os do serviço aberto, e não os da lista.

        É metade da razão de dar endereço próprio a cada um: quem procura
        "fotógrafo de maternidade" vê no resultado do Google uma página sobre
        maternidade, com esse título, e não o mesmo "Serviços e Packs" repetido
        quatro vezes a competir consigo próprio.
      */}
      <Seo
        title={pagina.seoTitle}
        description={pagina.seoDescription}
        image={absoluteUrl(`/brand/portfolio/${local.image}-1440.webp`)}
        /*
          Em /servicos mostra-se o primeiro serviço, e o canonical aponta para
          o endereço próprio dele. Já na página do serviço não há canonical a
          declarar: é a própria.
        */
        canonical={doUrl ? undefined : servicoPath(aberto, lang)}
        jsonLd={[
          breadcrumbJsonLd([
            { nome: t.nav.home, caminho: link('home') },
            { nome: t.nav.services, caminho: link('services') },
            { nome: t.home.services[aberto].title, caminho: servicoPath(aberto, lang) },
          ]),
          /*
            Um `Service` só, o desta página, e não os quatro de cada vez. Com os
            quatro em todas as páginas, cada uma declarava ao Google que era
            sobre casamentos, maternidade, retratos e eventos ao mesmo tempo, o
            oposto do que se ganha em separá-las. Sem preços: declarar uma
            oferta sem valor é pior do que não a declarar.
          */
          {
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: t.home.services[aberto].title,
            description: pagina.seoDescription,
            serviceType: t.home.services[aberto].title,
            provider: { '@type': 'LocalBusiness', name: 'NEBULA', '@id': `${SITE_URL}/` },
            areaServed: { '@type': 'Country', name: 'Portugal' },
            image: absoluteUrl(`/brand/portfolio/${local.image}-1440.webp`),
            url: `${SITE_URL}${servicoPath(aberto, lang)}`,
          },
        ]}
      />

      <section className="container-px">
        <Breadcrumbs
          items={[
            { label: t.nav.services, to: 'services' },
            { label: t.home.services[aberto].title },
          ]}
        />

        {/*
          As quatro abas em cima de tudo, antes do título.

          É a primeira coisa que se vê depois das migalhas, e tem de ser: quem
          chega de uma pesquisa cai numa das quatro páginas, e o que precisa de
          perceber em primeiro lugar é que há mais três. Ao fundo da página
          isso descobria-se tarde de mais.

          Segue o padrão de abas da norma: `tablist`, `tab` e `tabpanel` com as
          ligações entre eles, uma só paragem de tabulação na barra, e as setas
          a mudar de aba.
        */}
        <div
          ref={barraRef}
          role="tablist"
          aria-label={t.services.label}
          onKeyDown={aoTeclado}
          /*
            `overflow-x-auto` é rede de segurança, não o plano: os espaçamentos
            foram apertados até as quatro caberem num telemóvel. Mas há ecrãs
            mais estreitos do que os que se testam, e sem isto a última aba
            ficava cortada pela margem e sem maneira de lá chegar.
          */
          className="relative flex border-b border-white/10 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {/*
            O realce e o risco que viajam. Ficam por baixo dos rótulos (`z-0`
            contra o `relative` de cada aba) e fora do fluxo, por isso não
            empurram nada enquanto se movem.
          */}
          {marca && (
            <>
              <motion.span
                aria-hidden="true"
                className="absolute top-0 bottom-0 left-0 rounded-t-lg"
                initial={false}
                animate={{ x: marca.x, width: marca.w }}
                transition={reduzido ? { duration: 0 } : viagem}
                style={{
                  background:
                    'linear-gradient(to bottom, rgba(252,255,240,0.10), rgba(252,255,240,0) 85%)',
                }}
              />
              <motion.span
                aria-hidden="true"
                className="absolute bottom-0 left-0 h-[2px] bg-titanium rounded-full"
                initial={false}
                animate={{ x: marca.x, width: marca.w }}
                transition={reduzido ? { duration: 0 } : viagem}
              />
            </>
          )}

          {CATEGORIES.map((c) => {
            const activa = aberto === c.id
            return (
              /*
                Uma ligação a sério, e não um botão a fingir de aba: abre em
                separador novo com o botão do meio, copia-se, e o Google
                segue-a até à página do serviço.
              */
              <Link
                key={c.id}
                to={servicoPath(c.id as ServicoId, lang)}
                ref={(el) => {
                  abasRef.current[c.id] = el
                }}
                role="tab"
                id={`aba-${c.id}`}
                aria-selected={activa}
                aria-controls="painel-servico"
                // Só a aba escolhida recebe tabulação: é o que faz a barra
                // contar como uma paragem e não como quatro.
                tabIndex={activa ? 0 : -1}
                className={`relative z-10 min-w-0 shrink-0 sm:shrink sm:flex-1 px-2 sm:px-5 py-4 min-h-[48px] text-center sm:text-left transition-colors duration-500 ${
                  activa ? 'text-titanium' : 'text-titanium/40 hover:text-titanium/80'
                }`}
              >
                <span
                  className="block truncate uppercase tracking-[0.03em] sm:tracking-[0.14em]"
                  style={{ fontSize: 'clamp(0.6rem, 1.1vw, 0.75rem)' }}
                >
                  {t.home.services[c.id].title}
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      {/*
        Daqui para baixo é tudo o painel da aba escolhida: a fotografia, o
        texto, as galerias e os packs deste serviço.
      */}
      <div role="tabpanel" id="painel-servico" aria-labelledby={`aba-${aberto}`} tabIndex={-1}>
        {/*
          A fotografia à esquerda e o serviço à direita.

          A fotografia é metade do argumento numa página de fotografia, e antes
          estava espremida ao lado de três cartões de packs. Aqui tem uma
          coluna inteira, em retrato, que é o formato em que as fotografias
          foram tiradas.
        */}
        <section className="container-px mt-10 sm:mt-14">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 xl:gap-20 lg:items-center">
            <Reveal y={24}>
              {capa ? (
                /*
                  Capa carregada no painel. É uma <img> simples e não o
                  <Picture>: o <Picture> escolhe entre tamanhos que só existem
                  para as fotografias do repositório, e uma capa carregada tem
                  um ficheiro só.
                */
                <img
                  src={publicUrl(capa.storageKey)}
                  alt={capa.alt || local.alt}
                  decoding="async"
                  style={{ objectPosition: capa.pos }}
                  className="w-full aspect-[4/5] lg:max-h-[600px] rounded-2xl object-cover"
                />
              ) : (
                <Picture
                  name={local.image}
                  alt={local.alt}
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className={`w-full aspect-[4/5] lg:max-h-[600px] rounded-2xl object-cover ${local.imgPos}`}
                />
              )}
            </Reveal>

            <Reveal y={24} delay={0.12}>
              <span className="label-sm">{t.services.label}</span>
              <h1
                className="mt-3 leading-[1.02]"
                style={{ fontSize: 'clamp(2.4rem, 5vw, 4rem)' }}
              >
                {t.home.services[aberto].title}
              </h1>
              <p className="mt-6 text-titanium/60 leading-relaxed text-[15px] sm:text-base">
                {pagina.intro}
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link
                  to={link('contact')}
                  className="group inline-flex items-center gap-3 bg-titanium text-eerie px-8 py-4 rounded-full text-[11px] uppercase tracking-[0.2em] font-semibold hover:gap-5 transition-all active:scale-95"
                >
                  {t.common.requestProposal}
                  <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                </Link>
                {/*
                  Só aparece quando o serviço tem mesmo uma categoria no
                  portefólio. Uma ligação que abre o portefólio inteiro sem
                  filtro lê-se como uma ligação partida.
                */}
                {cat.portfolio && (
                  <Link
                    to={`${link('portfolio')}#${cat.portfolio}`}
                    className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-titanium/50 border-b border-titanium/25 pb-1 hover:border-titanium/60 hover:text-titanium/80 transition-all min-h-[44px]"
                  >
                    {t.services.seeWork} <ArrowUpRight size={13} />
                  </Link>
                )}
              </div>
            </Reveal>
          </div>
        </section>

        {/*
          O que fazemos, em texto corrido.

          Uma lista de packs diz o que se compra, mas não diz como trabalhamos,
          quando se marca, o que chega ao fim. Quem está a decidir quer as duas
          coisas, e quem pesquisa no Google só encontra a segunda: uma página
          feita de rótulos e preços não tem texto nenhum para encontrar.
        */}
        <section className="container-px mt-20 sm:mt-28">
          <div className="grid gap-x-14 gap-y-10 md:grid-cols-2">
            {pagina.blocos.map((bloco, i) => (
              <Reveal key={bloco.titulo} delay={i * 0.08} y={28}>
                <h2 className="text-xl sm:text-2xl mb-3">{bloco.titulo}</h2>
                <p className="text-titanium/55 text-sm sm:text-[15px] leading-relaxed">
                  {bloco.texto}
                </p>
              </Reveal>
            ))}
          </div>
        </section>

        {/*
          As galerias privadas, com o ecrã verdadeiro dentro de um telemóvel.

          "Galeria online privada" é uma linha que está em todos os sites de
          fotografia do país e não quer dizer nada a ninguém. O ecrã diz.
        */}
        <section className="container-px mt-24 sm:mt-36">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="relative flex justify-center lg:justify-start">
              <Telemovel inclinacao={-3}>
                <EcraGaleria />
              </Telemovel>
            </div>

            <div>
              <Reveal y={28}>
                <span className="label-sm">{t.services.galerias.label}</span>
                <h2
                  className="mt-3 leading-[1.08]"
                  style={{ fontSize: 'clamp(1.9rem, 3.4vw, 2.8rem)' }}
                >
                  {t.services.galerias.titulo}
                </h2>
                <p className="mt-5 text-titanium/55 leading-relaxed text-[15px]">
                  {t.services.galerias.texto}
                </p>
                <ul className="mt-7 space-y-3">
                  {t.services.galerias.pontos.map((p) => (
                    <Ponto key={p}>{p}</Ponto>
                  ))}
                </ul>
                <Link
                  to={link('gallery')}
                  className="mt-8 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-titanium/50 border-b border-titanium/25 pb-1 hover:border-titanium/60 hover:text-titanium/80 transition-all min-h-[44px]"
                >
                  {t.services.galerias.cta} <ArrowUpRight size={13} />
                </Link>
              </Reveal>
            </div>
          </div>
        </section>

        {/*
          A página dos convidados, só nos casamentos (ver a marca `convidados`
          em CATEGORIES). O telemóvel fica do lado oposto ao das galerias: dois
          seguidos do mesmo lado liam-se como a mesma secção repetida.
        */}
        {'convidados' in cat && cat.convidados && (
          <section className="container-px mt-24 sm:mt-36">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div className="order-1 lg:order-2 relative flex justify-center lg:justify-end">
                <Telemovel inclinacao={3} atraso={0.1}>
                  <EcraConvidados />
                </Telemovel>
              </div>

              <div className="order-2 lg:order-1">
                <Reveal y={28}>
                  <span className="label-sm">{t.services.convidados.label}</span>
                  <h2
                    className="mt-3 leading-[1.08]"
                    style={{ fontSize: 'clamp(1.9rem, 3.4vw, 2.8rem)' }}
                  >
                    {t.services.convidados.titulo}
                  </h2>
                  <p className="mt-5 text-titanium/55 leading-relaxed text-[15px]">
                    {t.services.convidados.texto}
                  </p>
                  <ul className="mt-7 space-y-3">
                    {t.services.convidados.pontos.map((p) => (
                      <Ponto key={p}>{p}</Ponto>
                    ))}
                  </ul>
                  <Link
                    to={link('contact')}
                    className="mt-8 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-titanium/50 border-b border-titanium/25 pb-1 hover:border-titanium/60 hover:text-titanium/80 transition-all min-h-[44px]"
                  >
                    {t.services.convidados.cta} <ArrowUpRight size={13} />
                  </Link>
                  {/*
                    A nota de que o casamento é inventado. Pequena, mas tem de
                    lá estar: sem ela, aquilo parece o casamento de clientes
                    nossos posto numa página de vendas.
                  */}
                  <p className="mt-6 text-[11px] text-titanium/30">{t.services.mockup.nota}</p>
                </Reveal>
              </div>
            </div>
          </section>
        )}

        {/* Os packs, agora no fim: quem chegou até aqui já sabe o que compra. */}
        <section className="container-px mt-24 sm:mt-36">
          <Reveal className="mb-8 sm:mb-10">
            <span className="label-sm">{t.services.packsLabel}</span>
            <h2 className="mt-3 text-3xl sm:text-4xl">{t.services.packsTitulo}</h2>
          </Reveal>

          <div className={`grid gap-4 sm:gap-5 ${colunas(cat.packs.length)}`}>
            {cat.packs.map((pack, i) => (
              <Reveal key={pack.name} delay={i * 0.1} y={30}>
                <div className="h-full border border-white/10 rounded-2xl p-6 sm:p-7 flex flex-col hover:border-white/25 transition-colors duration-500">
                  <h3 className="text-xl mb-4">{t.services.packs[pack.name]}</h3>
                  {'herda' in pack && (
                    <p className="text-sm text-titanium/45 mb-3 leading-snug">
                      {t.services.inheritsFrom(t.services.packs[pack.herda])}
                    </p>
                  )}
                  <ul className="space-y-2.5 flex-1">
                    {pack.items.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2.5 text-sm text-titanium/55"
                      >
                        <Check size={13} className="mt-0.5 shrink-0 text-titanium/70" />
                        {t.services.items[item]}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={link('contact')}
                    className="mt-6 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-titanium/50 border-b border-titanium/25 pb-1 hover:border-titanium/60 hover:text-titanium/80 transition-all w-fit min-h-[44px]"
                  >
                    {t.common.requestProposal} <ArrowRight size={12} />
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Upsell */}
        <section className="container-px mt-16 sm:mt-24">
          <div className="border border-white/10 rounded-2xl p-8 sm:p-12 text-center">
            <Reveal>
              <span className="label-sm">{t.services.addonLabel}</span>
              <h2 className="text-2xl sm:text-4xl mt-4 mb-5">{t.services.addonTitle}</h2>
              <p className="text-titanium/55 max-w-md mx-auto text-sm leading-relaxed mb-8">
                {t.services.addonText}
              </p>
              <Link
                to={link('contact')}
                className="inline-flex items-center gap-3 bg-titanium text-eerie px-9 py-5 rounded-full text-[11px] uppercase tracking-[0.2em] font-semibold group hover:gap-5 transition-all active:scale-95"
              >
                {t.common.requestQuote}
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </Reveal>
          </div>
        </section>
      </div>
    </div>
  )
}
