import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'
import Reveal from '../lib/Reveal'
import Picture from '../lib/Picture'
import { CAPAS_LOCAIS } from '../lib/servicosCapas'
import { publicUrl } from '../lib/site-content/public'
import { useServiceCovers } from '../lib/site-content/useSiteContent'
import Seo from '../lib/Seo'
import { SITE_URL, absoluteUrl } from '../lib/site'
import { useLink, useT } from '../lib/i18n'
import Breadcrumbs from '../components/Breadcrumbs'
import { breadcrumbJsonLd } from '../lib/breadcrumbJsonLd'

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
    packs: [
      { name: 'essencia', items: ['photoSession', 'sessao1h', 'fotos10', 'privateGallery'] },
      {
        name: 'origem',
        items: ['photoEditorial', 'sessao2h', 'fotos20', 'privateGallery', 'sneakPeek'],
      },
      {
        name: 'nebula',
        herda: 'origem',
        items: ['sessao3h', 'preparacao', 'fotosTodas', 'verticalReels', 'entregaRapida'],
      },
    ],
  },
  {
    id: 'eventos',
    // Os trabalhos que ilustram este serviço vivem em "Retratos".
    portfolio: 'retratos',
    packs: [
      { name: 'foto', items: ['eventPhoto', 'privateGallery'] },
      { name: 'fotoVideo', items: ['eventPhotoVideo', 'privateGallery', 'sneakPeek'] },
    ],
  },
] as const

/*
  Fundo do painel dos serviços, e da aba escolhida.

  Sólido e não um branco translúcido porque a aba tem de tapar a borda do
  painel com a mesma cor exacta, e uma cor translúcida deixava a linha a
  transparecer por baixo. Um pouco acima do fundo da página (#141414), o
  suficiente para o painel se destacar sem parecer outra caixa.
*/
const PAINEL = '#1c1c1c'

/** Só abrimos a categoria pedida se ela existir — o hash vem do URL. */
function categoriaDoHash(hash: string) {
  const id = decodeURIComponent(hash.replace('#', ''))
  return CATEGORIES.some((c) => c.id === id) ? id : null
}

export default function Services() {
  const t = useT()
  const link = useLink()
  const { hash } = useLocation()
  // Capas escolhidas no painel. Serviço sem capa lá fica com a do repositório.
  const capas = useServiceCovers()
  // Vindo de um cartão da página inicial (/servicos#maternidade), abre logo essa
  // categoria em vez da primeira.
  const [open, setOpen] = useState<string>(() => categoriaDoHash(hash) ?? 'casamentos')
  /*
    A barra das abas, para o salto vindo de um cartão da página inicial ficar
    com as abas à vista e não com o painel colado ao topo. Antes havia uma
    referência por categoria porque cada uma era uma secção; agora o painel é
    um só e o que interessa mostrar é a escolha.
  */
  const barraRef = useRef<HTMLDivElement | null>(null)
  const botoesRef = useRef<Record<string, HTMLButtonElement | null>>({})

  // Se o hash mudar sem sair da página (clicar noutro cartão a partir daqui),
  // acompanha-o já no render — sem efeito a disparar um segundo render.
  const [hashVisto, setHashVisto] = useState(hash)
  if (hash !== hashVisto) {
    setHashVisto(hash)
    const id = categoriaDoHash(hash)
    if (id && id !== open) setOpen(id)
  }

  useEffect(() => {
    const id = categoriaDoHash(hash)
    if (!id) return
    // Duas razões para o atraso: o ScrollToTop corre na mesma passagem e
    // desfaria o salto, e o painel ainda está a abrir — esperamos que assente
    // antes de medir. O desconto de 96px tira a categoria de debaixo da barra
    // fixa do topo.
    const t = setTimeout(() => {
      const el = barraRef.current
      if (!el) return
      const topo = el.getBoundingClientRect().top + window.scrollY - 96
      window.scrollTo({ top: Math.max(0, topo), behavior: 'smooth' })
    }, 150)
    return () => clearTimeout(t)
  }, [hash])

  /*
    Setas para mudar de aba, Home e End para a primeira e a última. É o que a
    norma manda para este padrão e é o que torna a barra utilizável sem rato:
    sem isto, e com uma só paragem de tabulação, quem navega por teclado
    chegava à barra e não conseguia sair da primeira aba.

    O foco vai para a aba nova a seguir a mudá-la, senão a selecção andava e o
    foco ficava para trás, e a leitura em voz alta deixava de corresponder ao
    que está escolhido.
  */
  function aoTeclado(e: React.KeyboardEvent<HTMLDivElement>) {
    // `string[]` e não a união literal: o `open` é uma string vinda do URL.
    const ids: string[] = CATEGORIES.map((c) => c.id)
    const i = ids.indexOf(open)
    let destino: string | null = null
    if (e.key === 'ArrowRight') destino = ids[(i + 1) % ids.length]
    else if (e.key === 'ArrowLeft') destino = ids[(i - 1 + ids.length) % ids.length]
    else if (e.key === 'Home') destino = ids[0]
    else if (e.key === 'End') destino = ids[ids.length - 1]
    if (!destino) return
    e.preventDefault()
    setOpen(destino)
    botoesRef.current[destino]?.focus()
  }

  return (
    <div className="pt-24 sm:pt-28 lg:pt-24 pb-16 sm:pb-20">
      <Seo
        title={t.services.seoTitle}
        description={t.services.seoDescription}
        image={absoluteUrl('/brand/portfolio/forest-bride-1440.webp')}
        jsonLd={[
          breadcrumbJsonLd([
            { nome: t.nav.home, caminho: link('home') },
            { nome: t.nav.services, caminho: link('services') },
          ]),
          // Um `Service` por categoria. Sem preços: declarar uma oferta sem
          // valor é pior do que não a declarar.
          ...CATEGORIES.map((cat) => ({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: t.home.services[cat.id].title,
            description: t.home.services[cat.id].tagline,
            serviceType: t.home.services[cat.id].title,
            provider: { '@type': 'LocalBusiness', name: 'NEBULA', '@id': `${SITE_URL}/` },
            areaServed: { '@type': 'Country', name: 'Portugal' },
            image: absoluteUrl(`/brand/portfolio/${CAPAS_LOCAIS[cat.id].image}-1440.webp`),
            url: `${SITE_URL}${link('services')}#${cat.id}`,
          })),
        ]}
      />

      {/* Header */}
      <section className="container-px mb-8 sm:mb-10">
        <Breadcrumbs items={[{ label: t.nav.services }]} />
        <Reveal>
          <span className="label-sm">{t.services.label}</span>
          {/*
            Menor a partir de lg do que nas outras páginas: aqui o objetivo é a
            página inteira caber num ecrã, e um título de 80px comia sozinho um
            quinto da altura disponível. No telemóvel fica igual ao resto do
            site, porque lá a página rola de qualquer maneira.
          */}
          <h1 className="mt-3 max-w-3xl leading-[1.05]" style={{ fontSize: 'clamp(2.2rem, 3.6vw, 3.2rem)' }}>
            {t.services.title}
          </h1>
        </Reveal>
      </section>

      {/*
        Abas lado a lado, e não uma lista de painéis empilhados.

        Empilhadas, os quatro serviços ocupavam quatro ecrãs e quem chegava
        aqui via um e tinha de rolar para descobrir que havia mais. Lado a
        lado, a oferta toda lê-se de uma vez e comparar dois é um clique em vez
        de um passeio.

        Segue o padrão de abas da norma: `tablist`, `tab` e `tabpanel` com as
        ligações entre eles, uma só paragem de tabulação na barra, e as setas a
        mudar de aba. Sem isso são quatro botões que por acaso parecem abas, e
        quem navega por teclado tem de passar por todos para chegar ao último.
      */}
      <section className="container-px">
        <div
          ref={barraRef}
          role="tablist"
          aria-label={t.services.label}
          onKeyDown={aoTeclado}
          /*
            `overflow-x-auto` é rede de segurança, não o plano.

            Os espaçamentos abaixo foram apertados até as quatro abas caberem
            num telemóvel sem rolar. Mas há ecrãs mais estreitos do que os que
            se testam, e línguas com palavras mais longas: sem isto, a última
            aba ficava cortada pela margem e sem maneira nenhuma de lá chegar,
            porque o body corta o que passa da largura. Com isto, no pior caso
            arrasta-se.

            A barra de rolagem fica escondida: aqui ela lia-se como um risco
            cinzento debaixo das abas e não como um controlo.
          */
          className="flex items-end overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {CATEGORIES.map((cat) => {
            const activa = open === cat.id
            return (
              <button
                key={cat.id}
                ref={(el) => {
                  botoesRef.current[cat.id] = el
                }}
                role="tab"
                id={`aba-${cat.id}`}
                aria-selected={activa}
                aria-controls="painel-servico"
                /*
                  Só a aba escolhida recebe tabulação. É o que faz a barra
                  contar como uma paragem e não como quatro: entra-se nela,
                  muda-se com as setas, e sai-se para o conteúdo.
                */
                tabIndex={activa ? 0 : -1}
                onClick={() => setOpen(cat.id)}
                /*
                  A aba escolhida cola-se ao painel: mesma cor de fundo, e a
                  borda de baixo pintada dessa cor a tapar a borda do painel.
                  É o `-mb-px` que a faz descer o pixel exacto que sobrepõe a
                  linha. Sem essa sobreposição fica um risco a atravessar a
                  aba, e o que devia ser uma pasta aberta lê-se como um botão
                  pousado por cima de uma caixa.

                  Por isso o painel tem fundo sólido e não translúcido: para a
                  borda de baixo da aba poder tapar a linha por completo. Um
                  branco a 4 por cento deixava-a a transparecer.
                */
                style={
                  activa
                    ? { background: PAINEL, borderBottomColor: PAINEL }
                    : undefined
                }
                /*
                  No telemóvel cada aba mede o que o texto pede; a partir de sm
                  dividem a largura por igual.

                  Com larguras iguais em 390px cada uma ficava com 86px e
                  "Maternidade" saía cortada a meio com reticências. Uma aba que
                  não diz o nome inteiro do serviço não serve para nada. Pelo
                  conteúdo, as quatro somam cerca de 305px e cabem à vontade.
                */
                className={`group relative -mb-px min-w-0 shrink-0 sm:shrink sm:flex-1 overflow-hidden border rounded-t-xl px-2 sm:px-4 py-3 sm:py-4 transition-colors min-h-[48px] ${
                  activa
                    ? 'z-10 border-white/12 text-titanium'
                    : 'border-transparent bg-white/[0.02] text-titanium/45 hover:bg-white/[0.05] hover:text-titanium/85'
                }`}
              >
                {/*
                  Realce e risco da aba escolhida, desenhados com `layoutId`.

                  É o mesmo par de elementos a mudar de sítio, não um a
                  aparecer e outro a desaparecer: o framer-motion trata dois
                  elementos com o mesmo `layoutId` como o mesmo objeto e anima-o
                  de uma posição para a outra. O resultado é o realce a deslizar
                  de aba em aba, que é o que dá vida a uma barra que sem isso
                  são quatro rectângulos a acender e apagar.

                  Ficam fora do fluxo e por baixo do rótulo: quem lê tem o texto
                  por cima, e o realce é fundo.
                */}
                {activa && (
                  <>
                    <motion.span
                      layoutId="aba-realce"
                      aria-hidden="true"
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute inset-0 rounded-t-xl"
                      style={{
                        background:
                          'linear-gradient(to bottom, rgba(252,255,240,0.12), rgba(252,255,240,0) 70%)',
                      }}
                    />
                    <motion.span
                      layoutId="aba-risco"
                      aria-hidden="true"
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute top-0 left-3 right-3 h-[2px] rounded-full"
                      style={{
                        background:
                          'linear-gradient(to right, rgba(252,255,240,0), rgba(252,255,240,0.85), rgba(252,255,240,0))',
                      }}
                    />
                  </>
                )}
                <span
                  className="relative block truncate text-center sm:text-left uppercase tracking-[0.05em] sm:tracking-[0.12em] transition-transform duration-300 group-hover:-translate-y-px"
                  style={{ fontSize: 'clamp(0.6rem, 1.1vw, 0.75rem)' }}
                >
                  {t.home.services[cat.id].title}
                </span>
              </button>
            )
          })}
        </div>

        {/*
          Um painel só, que troca de conteúdo. A transição é uma passagem de
          opacidade curta e não uma abertura em altura: com as abas fixas por
          cima, animar a altura fazia a página saltar debaixo do cursor de cada
          vez que se mudava de serviço.
        */}
        <div
          role="tabpanel"
          id="painel-servico"
          aria-labelledby={`aba-${open}`}
          tabIndex={0}
          style={{ background: PAINEL }}
          className="border border-white/12 rounded-b-2xl rounded-tr-2xl p-5 sm:p-7 xl:p-8"
        >
          <AnimatePresence mode="wait">
            {CATEGORIES.filter((c) => c.id === open).map((cat) => {
              const capa = capas[cat.id]
              // Fotografia do repositório, partilhada com os cartões da home.
              const local = CAPAS_LOCAIS[cat.id]
              return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="text-titanium/60 text-sm mb-5">{t.home.services[cat.id].tagline}</p>

                {/*
                  A fotografia ao lado dos packs e em retrato, não numa faixa
                  atravessada por cima deles.

                  A faixa tinha 64px de altura numa largura de mil e tal: nesse
                  formato não cabe fotografia nenhuma inteira, corta-se sempre
                  a cabeça ou os pés e o que sobra é uma tira de fundo. Num
                  site de fotografia, mostrar mal uma fotografia é o pior
                  defeito que uma página pode ter.

                  No telemóvel volta a ficar por cima, porque duas colunas
                  numa largura de 390px davam duas colunas más em vez de uma
                  boa, mas mantém o formato vertical.
                */}
                <div className="lg:grid lg:grid-cols-[auto_1fr] lg:gap-7 lg:items-start">
                  {/*
                    A altura da fotografia é o que sobra do ecrã, não um
                    número escolhido a olho: `100svh` menos os 470px que o resto
                    da página ocupa sempre (topo, título, abas, margens do
                    painel, packs e o link de baixo). Assim ela cresce num
                    monitor alto e encolhe num portátil baixo, e a página acaba
                    sempre à tangente do fundo do ecrã em vez de deixar folga
                    desperdiçada.

                    Com a altura definida e a proporção 3:4, é a largura que se
                    deduz — e por isso a coluna é `auto`. Os limites em cima e
                    em baixo existem para os extremos: num ecrã muito alto a
                    fotografia deixaria de caber ao lado dos packs, e num muito
                    baixo ficaria um selo.

                    3:4 e não outra proporção qualquer: é exactamente a das
                    fotografias de origem (480x640, 960x1280, 1440x1920), por
                    isso três das quatro categorias não sofrem corte nenhum. A
                    dos eventos é 0.89 e perde um pouco dos lados, e é para
                    isso que serve o `imgPos` de cada categoria.

                    O `sizes` leva 30vw e não uma largura fixa: a coluna
                    acompanha o ecrã, e num ecrã de alta densidade o browser
                    precisa de saber o espaço real para pedir a versão de 960 em
                    vez da de 480. Com uma largura fixa de 400px pedia a
                    pequena e entregava uma fotografia desfocada, que num site
                    de fotografia é o defeito que menos se pode dar ao luxo.
                  */}
                  {capa ? (
                    /*
                      Capa carregada no painel. É uma <img> simples e não o
                      <Picture>: o <Picture> escolhe entre tamanhos que só
                      existem para as fotografias do repositório, e uma capa
                      carregada tem um ficheiro só.

                      O recorte vem do painel em `pos` e entra por estilo, não
                      por classe: é um valor livre escolhido por quem carregou
                      a foto, e as classes do Tailwind são escritas antes de
                      existir alguém para as escolher.
                    */
                    <img
                      src={publicUrl(capa.storageKey)}
                      alt={capa.alt || local.alt}
                      loading="lazy"
                      decoding="async"
                      style={{ objectPosition: capa.pos }}
                      className="w-full aspect-[3/4] lg:w-auto lg:h-[calc(100svh-470px)] lg:max-h-[62vh] lg:min-h-[255px] rounded-xl object-cover mb-6 lg:mb-0"
                    />
                  ) : (
                    <Picture
                      name={local.image}
                      alt={local.alt}
                      sizes="(max-width: 1024px) 100vw, 30vw"
                      className={`w-full aspect-[3/4] lg:w-auto lg:h-[calc(100svh-470px)] lg:max-h-[62vh] lg:min-h-[255px] rounded-xl object-cover ${local.imgPos} mb-6 lg:mb-0`}
                    />
                  )}

                  <div>
                {/*
                  Os packs em tantas colunas quantos eles são, até três. Em duas
                  colunas, três packs ocupavam duas linhas e a página crescia
                  cerca de 200px por nada: a coluna da direita tem largura de
                  sobra para os três lado a lado.
                */}
                <div
                  className={`grid gap-3 sm:gap-4 ${
                    cat.packs.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'
                  }`}
                >
                  {cat.packs.map((pack) => (
                    <div
                      key={pack.name}
                      className="border border-white/10 rounded-xl p-4 sm:p-5 flex flex-col hover:border-white/20 transition-colors"
                    >
                      <h3 className="text-base mb-3">{t.services.packs[pack.name]}</h3>
                      {'herda' in pack && (
                        <p className="text-sm text-titanium/45 mb-2.5 leading-snug">
                          {t.services.inheritsFrom(t.services.packs[pack.herda])}
                        </p>
                      )}
                      <ul className="space-y-2 flex-1">
                        {pack.items.map((item) => (
                          <li key={item} className="flex items-start gap-2.5 text-sm text-titanium/55">
                            <Check size={13} className="mt-0.5 shrink-0 text-titanium/70" />
                            {t.services.items[item]}
                          </li>
                        ))}
                      </ul>
                      <Link
                        to={link('contact')}
                        className="mt-4 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-titanium/50 border-b border-titanium/25 pb-1 hover:border-titanium/60 hover:text-titanium/80 transition-all w-fit min-h-[44px]"
                      >
                        {t.common.requestProposal} <ArrowRight size={12} />
                      </Link>
                    </div>
                  ))}
                </div>

                {/*
                  Quem acaba de ler o que está incluído quer ver como fica, e o
                  portfólio abre já filtrado por esta categoria em vez de o
                  obrigar a procurar o filtro.

                  Só aparece quando o serviço tem mesmo uma categoria
                  correspondente. Um hash que não casa com categoria nenhuma
                  não dá erro: mostra o portfólio inteiro, sem filtro, como se
                  a ligação não tivesse feito nada, e quem clicou fica sem
                  perceber porquê.
                */}
                {cat.portfolio && (
                  <Link
                    to={`${link('portfolio')}#${cat.portfolio}`}
                    className="mt-6 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-titanium/50 border-b border-titanium/25 pb-1 hover:border-titanium/60 hover:text-titanium/80 transition-all"
                  >
                    {t.services.seeWork} <ArrowRight size={12} />
                  </Link>
                )}
                  </div>
                </div>
              </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </section>

      {/* Upsell */}
      <section className="container-px mt-12 sm:mt-16">
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
  )
}
