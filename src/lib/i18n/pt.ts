/**
 * Textos do site em português. É a língua de origem: quando houver texto novo,
 * escreve-se aqui primeiro e só depois se traduz em `en.ts` — que é tipado
 * contra este ficheiro e não compila enquanto faltar uma chave.
 */
export const pt = {
  nav: {
    home: 'Home',
    about: 'Sobre',
    services: 'Serviços',
    portfolio: 'Portfólio',
    gallery: 'Galeria privada',
    contact: 'Contacto',
    cta: 'Marcar sessão',
    openMenu: 'Abrir menu',
    closeMenu: 'Fechar menu',
    langLabel: 'Mudar idioma',
  },

  common: {
    backToSite: '← Voltar ao site',
    talkToUs: 'Falar connosco',
    exploreMore: 'Explorar',
    requestQuote: 'Pedir orçamento',
    requestProposal: 'Pedir proposta',
  },

  home: {
    seoTitle: 'NEBULA | Fotografia & Vídeo Cinematográfico em Lisboa',
    seoDescription:
      'Fotógrafo e videógrafo para casamentos, maternidade, retratos e eventos em Lisboa e Portalegre. Fotografia editorial e vídeo cinematográfico 4K.',
    place: 'Lisboa & Portalegre',
    headline: ['Histórias que ficam', 'Para sempre'],
    heroCta: 'Marcar Sessão',
    heroNote: 'Datas 2026 disponíveis',
    manifesto: ['O tempo passa.', 'As imagens ficam'],
    servicesLabel: 'O que fazemos',
    servicesTitle: 'Os nossos serviços',
    servicesLink: 'Ver todos os serviços & preços',
    services: {
      casamentos: { title: 'Casamentos', tagline: 'A vossa história de amor, contada para sempre.' },
      maternidade: { title: 'Maternidade', tagline: 'Celebrar a espera. Eternizar o início.' },
      retratos: { title: 'Retratos', tagline: 'Editorial, estúdio ou exterior. Quem és, em imagem.' },
      eventos: { title: 'Eventos', tagline: 'Coberturas à medida de cada ocasião.' },
    },
    stats: {
      stories: 'Histórias contadas',
      creators: 'Criadores visuais',
      allRound: 'Foto, vídeo e criação de conteúdo',
    },
    galleryLabel: 'Portfólio',
    galleryTitle: 'Momentos capturados',
    galleryLink: 'Galeria completa',
    processLabel: 'Como funciona',
    processTitle: 'Simples, do início ao fim',
    steps: [
      {
        title: 'Primeiro contacto',
        desc: 'Envie-nos uma mensagem pelo Instagram ou email. Respondemos em menos de 24 horas.',
      },
      {
        title: 'A vossa sessão',
        desc: 'No local que escolherem, com toda a atenção ao detalhe, à luz e às emoções do momento.',
      },
      {
        title: 'Entrega da galeria',
        desc: 'Galeria online privada com todas as imagens editadas. Sneak peek em 24h após a sessão.',
      },
    ],
    ctaTitle: ['Vamos contar', 'a vossa história?'],
    ctaButton: 'Fala connosco',
    ctaInstagram: 'Instagram',
  },

  testimonials: {
    label: 'Quem já passou por aqui',
    title: 'O que dizem de nós',
    previous: 'Testemunho anterior',
    next: 'Testemunho seguinte',
  },

  about: {
    seoTitle: 'Sobre nós | NEBULA Fotografia & Vídeo',
    seoDescription:
      'Somos três criadores visuais entre Lisboa e Portalegre: fotografia editorial, vídeo cinematográfico 4K e drone. Criatividade, rigor e autenticidade.',
    label: 'Sobre nós',
    title: 'O nascimento de algo novo, em cada projeto.',
    quote: 'O que podemos fazer por ti?',
    intro:
      'Somos uma equipa de três pessoas dedicadas à produção audiovisual com rigor e autenticidade. Cada projeto é abordado como único, com a criatividade e a precisão que merece. Baseados em Lisboa e Portalegre, trabalhamos em todo o Portugal.',
    contactLink: 'Fala connosco',
    valuesLabel: 'Valores',
    valuesTitle: 'O que nos guia',
    teamLabel: 'Equipa',
    teamTitle: 'Quem está por detrás',
    instagramTitle: 'Segue a nossa história',
    instagramText: 'Bastidores, trabalhos recentes e momentos do dia-a-dia em',
    instagramCta: 'Instagram',
    values: {
      creativity: {
        title: 'Criatividade',
        desc: 'Cada projeto é uma narrativa própria, nunca uma fórmula repetida. Desenhamos cada história a partir do zero.',
      },
      rigour: {
        title: 'Rigor',
        desc: 'Profissionalismo em cada detalhe, do primeiro contacto à entrega final. Sem compromissos.',
      },
      authenticity: {
        title: 'Autenticidade',
        desc: 'Capturamos o real, sem artifícios. Emoção genuína em cada fotograma, sem encenações.',
      },
    },
    team: {
      label: 'A equipa',
      daniel: { role: 'Videógrafo & Filmmaker', sub: 'Operador de Drone' },
      camila: { role: 'Fotógrafa', sub: 'Sessões editoriais & maternidade' },
      patrick: { role: 'Fotógrafo', sub: 'Casamentos & eventos' },
    },
  },

  services: {
    seoTitle: 'Serviços & Packs | NEBULA Fotografia & Vídeo',
    seoDescription:
      'Packs de fotografia e vídeo para casamentos, maternidade, retratos e eventos: vídeo 4K, drone, pré-wedding, galeria online privada e sneak peek em 24h.',
    label: 'Serviços',
    title: 'Feito para o teu momento.',
    seeWork: 'Ver trabalhos desta categoria',
    /*
      Usado no pack de topo: "Tudo o que o pack Origem tem, e ainda".

      A palavra "pack" está lá por gramática e não por gosto: sem ela é preciso
      um artigo antes do nome, e o artigo certo muda com o nome. "O Origem" e "a
      Essência" não cabem os dois na mesma frase feita. Com "o pack" à frente, o
      artigo concorda sempre com "pack" e qualquer nome serve.
    */
    inheritsFrom: (pack: string) => `Tudo o que o pack ${pack} tem, e ainda`,
    addonLabel: 'À medida',
    addonTitle: 'Monta o teu pack',
    addonText:
      'Nenhum pack tem de ficar como está. Junta vídeo 4K, drone, mais horas ou uma segunda sessão. Diz-nos o que imaginas e fazemos as contas.',

    /*
      O texto próprio de cada serviço.

      Vive aqui e não na página porque cada serviço passou a ter endereço
      próprio, e é este texto que faz cada um deles valer alguma coisa numa
      pesquisa: quem procura "fotógrafo de maternidade" encontra uma página
      sobre maternidade, e não uma frase sobre maternidade dentro de uma página
      sobre tudo.
    */
    paginas: {
      casamentos: {
        seoTitle: 'Fotógrafo de Casamentos | NEBULA',
        seoDescription:
          'Fotografia e vídeo de casamento em Lisboa, Sintra e Portalegre. Equipa de três, drone, galeria de convidados e primeiras fotografias em 24 horas.',
        intro:
          'Um casamento acontece uma vez e não volta a acontecer. Não há segunda tentativa, não há repetir o plano, não há pedir à noiva que volte a entrar. É por isso que trabalhamos em equipa e não sozinhos, e é por isso que entregamos as primeiras fotografias no dia seguinte.',
        blocos: [
          {
            titulo: 'Como trabalhamos no dia',
            texto:
              'Somos três: dois fotógrafos e um videógrafo. Enquanto um está com a noiva a preparar-se, o outro está com o noivo, e ninguém tem de escolher entre os dois lados da mesma manhã. Durante a cerimónia, dois ângulos ao mesmo tempo, sem ninguém a correr pelo corredor. Trabalhamos de forma discreta: o dia é vosso e dos vossos convidados, não nosso.',
          },
          {
            titulo: 'Fotografia e filme, feitos juntos',
            texto:
              'A fotografia e o vídeo não são dois trabalhos encaixados à força no mesmo dia. Quem filma está connosco desde o princípio, sabe o que vai acontecer a seguir e não precisa de mandar parar para gravar outra vez. Nos packs com filme entregamos também um vídeo vertical de até um minuto, do tamanho e do formato que as redes pedem.',
          },
          {
            titulo: 'O que os vossos convidados viram',
            texto:
              'As melhores fotografias da noite estão quase sempre nos telemóveis dos convidados, e acabam perdidas em conversas de grupo. Cada casamento nosso tem um código próprio, que se imprime e se põe nas mesas: quem o lê entrega as fotografias que tirou, sem instalar nada e sem criar conta nenhuma. Vocês recebem tudo organizado, e decidem o que fica.',
          },
          {
            titulo: 'Depois do casamento',
            texto:
              'No dia seguinte recebem uma primeira seleção, para poderem mostrar a quem esteve lá e a quem não pôde ir. As fotografias completas chegam numa galeria online privada, com endereço e palavra-passe só vossos, de onde descarregam tudo de uma vez ou escolhem uma a uma. Não são publicadas em lado nenhum sem vocês dizerem que sim.',
          },
        ],
      },
      maternidade: {
        seoTitle: 'Fotografia de Maternidade e Gravidez | NEBULA',
        seoDescription:
          'Sessões de maternidade em estúdio ou exterior, em Lisboa, Sintra e Portalegre. Fotografia e vídeo lifestyle, com galeria online privada.',
        intro:
          'Uma barriga muda de semana para semana e depois desaparece. A sessão de maternidade não é sobre estar grávida: é sobre o intervalo curto em que já se é mãe e ainda não se conhece a cara de quem vem.',
        blocos: [
          {
            titulo: 'Quando marcar',
            texto:
              'Entre as 28 e as 34 semanas é onde a barriga já se vê bem e o corpo ainda não pesa tanto que uma sessão canse. Mais tarde é possível, mas marca-se com margem: a partir das 36 semanas há sempre a hipótese de o bebé decidir antecipar tudo.',
          },
          {
            titulo: 'Estúdio ou exterior',
            texto:
              'Em estúdio controlamos a luz e o fundo, e o resultado é mais editorial, mais limpo, mais de revista. No exterior ganha-se o sítio e a hora: o fim de tarde, o campo, a praia. Não há melhor nem pior, há o que se quer pendurado na parede daqui a dez anos. Escolhem, e ajudamos a escolher.',
          },
          {
            titulo: 'Quem entra na fotografia',
            texto:
              'O pai entra sempre que quiser, e os filhos que já cá estão também. Não há packs a menos por causa disso, e não cobramos por pessoa. O que muda entre um pack e outro é o tempo que a sessão tem e quantas roupas dá para vestir sem andar com pressa.',
          },
          {
            titulo: 'O que recebem',
            texto:
              'As fotografias escolhidas e tratadas, numa galeria online privada de onde descarregam o que quiserem, com a qualidade que serve para imprimir. Nos packs com vídeo entregamos também um filme curto, do género que se guarda e se volta a ver, e um vertical para partilhar.',
          },
        ],
      },
      retratos: {
        seoTitle: 'Retratos e Book Fotográfico | NEBULA',
        seoDescription:
          'Retrato editorial em estúdio ou exterior, em Lisboa, Sintra e Portalegre. Para marca pessoal, book ou uso próprio, com galeria online privada.',
        intro:
          'A maior parte das pessoas não gosta de ser fotografada, e quase sempre é porque nunca foi fotografada bem. Um retrato que presta não é uma questão de sorte nem de ser fotogénico: é luz, tempo e alguém que diga o que fazer com as mãos.',
        blocos: [
          {
            titulo: 'Para que serve um retrato',
            texto:
              'Para uma marca pessoal que precisa de uma cara, para um book de quem trabalha com a imagem, para um perfil que ainda tem uma fotografia tirada por um amigo há seis anos. E para nada disso: há quem faça um retrato só porque quer uma fotografia sua de que goste, e essa é uma razão tão boa como as outras.',
          },
          {
            titulo: 'Não é preciso saber posar',
            texto:
              'Ninguém sabe posar, e quem diz que sabe costuma ficar pior. A direcção é nossa: dizemos onde pôr o peso, para onde olhar, o que fazer com os braços. Nos packs com preparação, falamos antes do dia sobre roupas e referências, para chegar à sessão com as decisões tomadas e não a escolher à porta.',
          },
          {
            titulo: 'Estúdio ou exterior',
            texto:
              'Em estúdio a luz é nossa e o fundo desaparece: fica a pessoa e mais nada. No exterior entra o sítio, a hora e o acaso, e o retrato passa a contar também onde foi feito. Dá para fazer os dois na mesma sessão, se houver tempo para isso.',
          },
          {
            titulo: 'O que recebem',
            texto:
              'As fotografias tratadas numa galeria online privada, prontas para imprimir e para usar em qualquer lado. Não marcamos as fotografias com o nosso nome nem pedimos crédito para as usar. São vossas.',
          },
        ],
      },
      eventos: {
        seoTitle: 'Fotografia de Eventos | NEBULA',
        seoDescription:
          'Cobertura fotográfica e de vídeo para festas, aniversários e eventos de empresa, em Lisboa, Sintra e Portalegre.',
        intro:
          'Festas de anos, baptizados, jantares de empresa, lançamentos. Um evento não tem um guião como um casamento, e por isso não tem um pack fixo: combina-se o que é preciso, e cobra-se o que for combinado.',
        blocos: [
          {
            titulo: 'Porque não há packs aqui',
            texto:
              'Porque ainda não fizemos eventos que cheguem para prometer números com honestidade. Um pack é uma promessa com horas e quantidades lá dentro, e escrever isso sem saber seria descobri-lo ao mesmo tempo que o cliente, no próprio dia. Preferimos combinar convosco e dizer o que conseguimos fazer.',
          },
          {
            titulo: 'O que combinamos',
            texto:
              'Quantas horas, quantas pessoas da nossa parte, se há vídeo além de fotografia, e o que é que tem mesmo de ficar registado. Um jantar de empresa quer os discursos e os grupos; uma festa de anos quer o bolo e a cara de quem o sopra. Não é o mesmo trabalho e não se resolve com o mesmo plano.',
          },
          {
            titulo: 'Também aqui há galeria privada',
            texto:
              'As fotografias chegam numa galeria online com endereço e palavra-passe próprios, de onde a empresa ou a família descarrega o que quiser. Para eventos de empresa, isso resolve o problema habitual de andar a mandar ficheiros grandes por email a dez pessoas diferentes.',
          },
        ],
      },
    },
    items: {
      photoEditorial: 'Fotografia editorial',
      horas6: 'Cobertura de 6 horas',
      horas8: 'Cobertura de 8 horas',
      fotos200: '200 a 300 fotografias editadas',
      fotos300: '300 a 500 fotografias editadas',
      /*
        Estas linhas substituem as do pack de baixo em vez de se somarem a elas.

        Já disseram isso à frente ("em vez de 8 horas"), e ficava pesado: cada
        cartão passava a carregar a comparação em vez do que oferece. Sem a
        muleta, conta-se com quem lê perceber que o número maior manda, que é o
        que qualquer pessoa percebe ao comparar dois cartões lado a lado.
      */
      diaCompleto: 'Cobertura do dia completo',
      fotosTodas: 'Todas as fotografias selecionadas',
      verticalReels: 'Vídeo vertical até 1 minuto para redes',
      entregaRapida: 'Entrega em prazo reduzido',
      privateGallery: 'Galeria online privada',
      sneakPeek: 'Sneak Peek em 24h',
      photoVideo4k: 'Fotografia + Filme 4K',
      preWedding: 'Pré-wedding incluído',
      drone: 'Filmagens de drone',
      team: 'Equipa de três: dois fotógrafos e um videógrafo',
      guestGallery: 'Galeria de convidados online',
      photoSession: 'Sessão de fotografia',
      /*
        Duração e roupas na mesma linha, e as duas linhas com a mesma forma.
        Postas em paralelo, a diferença entre os packs lê-se sem ser preciso
        comparar palavra a palavra: um e um, contra dois e dois.
      */
      sessao1h: '1 hora, uma roupa',
      sessao2h: '2 horas, duas roupas',
      sessao3h: 'Até 3 horas e três roupas',
      fotos20Mais: '20 a 50 fotografias editadas',
      localEscolha: 'Exterior ou estúdio, à escolha',
      preparacao: 'Preparação antes do dia: roupas e referências',
      fotos10: '10 a 20 fotografias editadas',
      fotos20: '20 a 40 fotografias editadas',
      photoVideoLifestyle: 'Fotografia + Vídeo lifestyle',
      eventoCobertura: 'Cobertura fotográfica, com ou sem vídeo',
      eventoCombinado: 'Horas e equipa combinadas convosco',
    },
    packs: {
      essencia: 'Essência',
      origem: 'Origem',
      nebula: 'Nebula',
      medida: 'À medida',
    },
  },

  portfolio: {
    seoTitle: 'Portfólio | NEBULA Fotografia & Vídeo',
    seoDescription:
      'Galeria de retratos, maternidade e casamentos fotografados pela NEBULA em Lisboa, Portalegre e restante Portugal.',
    label: 'Portfólio',
    title: 'O nosso trabalho.',
    all: 'Todos',
    filterLabel: 'Filtrar portfólio por categoria',
    openLarge: 'Ver em grande',
    cursorView: 'Ver',
    close: 'Fechar',
    prev: 'Fotografia anterior',
    next: 'Fotografia seguinte',
  },

  contact: {
    seoTitle: 'Contacto | NEBULA Fotografia & Vídeo',
    seoDescription:
      'Fale connosco por email ou Instagram sobre o vosso casamento, sessão de maternidade, retratos ou evento. Lisboa e Portalegre. Resposta em menos de 24 horas.',
    label: 'Contacto',
    title: 'Vamos falar sobre o vosso projeto.',
    replyTime: 'Respondemos em menos de 24 horas',
    locationLabel: 'Localização',
    location: 'Lisboa & Portalegre, Portugal',
    how: 'Todo o contacto é feito por email ou Instagram. É onde respondemos mais depressa e onde fica registo da conversa.',
    formTitle: 'Formulário',
    name: 'Nome',
    email: 'Email',
    service: 'Serviço',
    date: 'Data do evento',
    location_: 'Local',
    optional: '(opcional)',
    message: 'Mensagem',
    messagePlaceholder:
      'Contem-nos o que têm em mente: quando, onde, e o que gostavam de ter no fim.',
    privacyNote: 'Ao enviar, os vossos dados são usados apenas para responder a este pedido. Sabem mais na',
    privacyLink: 'política de privacidade',
    submit: 'Enviar mensagem',
    draftRestored: 'Recuperámos o que tinham começado a escrever.',
    errors: {
      name: 'Diz-nos como te chamas.',
      email: 'Este email não parece estar completo.',
      message: 'Escreve-nos duas linhas sobre o que imaginas.',
      pastDate: 'Essa data já passou.',
    },
    sending: 'A enviar…',
    sentTitle: 'Mensagem enviada.',
    sentText: 'Obrigado pelo contacto. Respondemos em breve.',
    mailtoTitle: 'Falta só enviar.',
    mailtoText: 'Abrimos o vosso programa de email com a mensagem já escrita. Basta premir enviar.',
    mailtoFallback: 'Não abriu nada? Escrevam-nos para',
    or: 'ou por',
    instagramDm: 'Instagram',
    errorText: 'Não conseguimos enviar a mensagem. Escrevam-nos diretamente para',
    mailSubject: (servico: string, nome: string) => `Pedido de ${servico}: ${nome}`,
    mailBody: {
      name: 'Nome',
      email: 'Email',
      service: 'Serviço',
      date: 'Data do evento',
      location: 'Local',
      undefined_: '(por definir)',
    },
  },

  thanks: {
    seoTitle: 'Obrigado | NEBULA',
    seoDescription: 'Recebemos a vossa mensagem.',
    label: 'Recebido',
    title: 'Obrigado. Já temos a vossa mensagem.',
    sent: 'Respondemos em menos de 24 horas, normalmente bem antes disso. Se for urgente, o Instagram é o caminho mais rápido.',
    mailto: 'Abrimos o vosso programa de email com a mensagem escrita. Falta só carregar em enviar. Se nada abriu, escrevam-nos diretamente.',
    next: 'Entretanto',
    seePortfolio: 'Ver o portfólio',
    seeServices: 'Serviços & packs',
  },

  notFound: {
    seoTitle: 'Página não encontrada | NEBULA',
    seoDescription: 'A página que procuras não existe ou mudou de sítio.',
    label: 'Erro 404',
    title: 'Esta página perdeu-se no escuro.',
    text: 'O endereço não existe ou mudou de sítio. Fica aqui o caminho de volta, e já agora o que vale mesmo a pena ver.',
    navLabel: 'Páginas principais',
    services: 'Serviços & preços',
    clientArea: 'Área de cliente',
  },

  privacy: {
    seoTitle: 'Política de privacidade | NEBULA',
    seoDescription:
      'Como a NEBULA trata os dados pessoais recolhidos no site: formulário de contacto, galerias privadas de cliente e estatísticas sem cookies.',
    label: 'Privacidade',
    title: 'O que fazemos com os teus dados.',
    updated: 'Última atualização:',
    updatedAt: '3 de setembro de 2026',
    sections: [
      {
        title: 'Quem trata os teus dados',
        paragraphs: [
          'Os dados recolhidos neste site são tratados pela NEBULA, que presta serviços de fotografia e vídeo em Portugal.',
          'Responsável pelo tratamento: Daniel Rovisco, NIF 240055233, Rua António Silva, Bairro São Carlos, n.º 4, 3.º Dto., 2725-170 Mem Martins, Portugal.',
          'Para qualquer questão sobre privacidade, o contacto é:',
        ],
      },
      {
        title: 'Que dados recolhemos, e porquê',
        paragraphs: [
          'Formulário de contacto. Nome, email, tipo de serviço e, se os indicares, a data e o local do evento, além da mensagem que escreveres. Servem apenas para te responder e preparar uma proposta. A base legal é o teu pedido: sem estes dados não conseguimos responder. Enquanto escreves, o texto fica guardado no teu próprio browser para não se perder se saíres da página; é apagado assim que envias, e nunca sai do teu dispositivo antes disso.',
          'Galerias privadas. Quando és nosso cliente, criamos uma galeria protegida por password com as fotografias e os vídeos da tua sessão. Guardamos o nome que dá título à galeria, as fotografias que marcares como favoritas e um registo técnico de quando foi aberta e do que foi descarregado. Esse registo existe para percebermos se a entrega chegou bem e para detetarmos acessos indevidos; não guardamos o teu endereço IP nem qualquer identificador de dispositivo.',
          'Estatísticas do site. Usamos uma ferramenta de estatísticas sem cookies, que conta visitas de forma agregada e anónima. Não é possível identificar-te a partir dela, não seguimos ninguém entre sites, e é por isso que este site não te chateia com um aviso de cookies.',
          'Não recolhemos dados sensíveis, não fazemos decisões automatizadas sobre ti e nunca vendemos nem cedemos os teus dados a terceiros para fins comerciais.',
        ],
      },
      {
        title: 'Cookies e o que fica guardado no teu browser',
        paragraphs: [
          'Este site não usa cookies. Nem nossos, nem de terceiros, nem de publicidade ou de seguimento entre sites. É por isso que não te aparece nenhum aviso a pedir consentimento: não há nada a consentir.',
          'Usa, isso sim, o armazenamento do próprio browser para se lembrar de coisas que tu pediste, e que ficam no teu dispositivo sem nunca serem enviadas para nós:',
        ],
        list: [
          'O que escreveste no formulário de contacto, para não se perder se saíres da página. Apagado assim que envias.',
          'O acesso a uma galeria depois de acertares na password, para não a teres de escrever outra vez a cada página. Dura no máximo duas horas e desaparece quando fechas o separador.',
          'A password da galeria, enquanto lá estiveres, apenas para o botão que copia a mensagem de partilha. Também desaparece ao fechar o separador.',
          'A marca de que já viste a animação de entrada, para ela não se repetir a cada visita.',
          'Duas marcas técnicas que servem para o site se recuperar sozinho quando um ficheiro não carrega.',
        ],
        after:
          'Nada disto te identifica nem nos chega às mãos. Podes apagar tudo a qualquer momento, limpando os dados do site nas definições do teu browser; a única consequência é teres de escrever a password da galeria de novo.',
      },
      {
        title: 'Quem mais lhes toca',
        paragraphs: [
          'Para o site funcionar recorremos a fornecedores que tratam dados por nossa conta e apenas segundo as nossas instruções:',
        ],
        list: [
          'GitHub Pages: alojamento do site.',
          'Supabase: base de dados das galerias e autenticação do nosso painel.',
          'Cloudflare R2: armazenamento das fotografias e vídeos.',
          'Formspree: encaminha para o nosso email a mensagem que escreves no formulário de contacto.',
          'Umami: contagem agregada de visitas, sem cookies.',
        ],
        after:
          'Alguns destes fornecedores são norte-americanos e podem tratar dados fora da União Europeia, ao abrigo das cláusulas contratuais-tipo da Comissão Europeia.',
      },
      {
        title: 'Quanto tempo ficam connosco',
        paragraphs: [
          'As mensagens de contacto ficam no nosso email enquanto durar a conversa e, se não avançar para trabalho, até um ano depois.',
          'As galerias de cliente têm uma data de validade definida na entrega, normalmente alguns meses, e avisamos-te antes de fecharem, para teres tempo de descarregar tudo. Findo esse prazo, a galeria é fechada e os ficheiros são eliminados do nosso armazenamento. Guardamos os originais do trabalho enquanto for razoável para o nosso arquivo profissional.',
        ],
      },
      {
        title: 'Fotografias e direitos de imagem',
        paragraphs: [
          'As fotografias e vídeos que fazemos são obras nossas, e é ao contrato de cada trabalho que cabe definir o que cada parte pode fazer com eles.',
          'Só publicamos imagens onde apareças, seja no portfólio, no site ou nas redes sociais, se o tiveres autorizado. Se mudares de ideias, escreve-nos e retiramos as imagens dos nossos canais o mais depressa que conseguirmos.',
        ],
      },
      {
        title: 'Os teus direitos',
        paragraphs: [
          'Podes pedir-nos acesso aos teus dados, correção do que estiver errado, apagamento, limitação do tratamento, uma cópia em formato legível por computador, ou opor-te a determinado tratamento. Basta escreveres. Respondemos no prazo de um mês:',
          'Se achares que não tratámos o assunto como devíamos, tens o direito de apresentar reclamação à Comissão Nacional de Proteção de Dados (CNPD), a autoridade de controlo em Portugal.',
        ],
      },
    ],
  },

  galleryAccess: {
    seoTitle: 'Galeria privada | NEBULA',
    seoDescription: 'Acesso à galeria privada de clientes NEBULA.',
    label: 'Área de clientes',
    title: 'A vossa galeria privada.',
    intro: 'Introduzam o código e a password que vos enviámos. Se não os tiverem à mão, é só dizer.',
    code: 'Código da galeria',
    codePlaceholder: 'ex. ana-e-tiago',
    password: 'Password',
    enter: 'Entrar',
    checking: 'A verificar…',
    wrong: 'Código ou password incorretos. Ao fim de várias tentativas falhadas o acesso fica temporariamente bloqueado. Se precisarem,',
    writeToUs: 'escrevam-nos',
    serverError: 'Não conseguimos verificar o acesso neste momento. Tentem daqui a pouco ou',
    talkToUs: 'falem connosco',
    notConfiguredTitle: 'Galerias por configurar',
    notConfigured: 'Faltam as variáveis do Supabase neste deploy, por isso o acesso está indisponível. Ver o README.',
  },

  gallery: {
    seoDescription: 'Galeria privada de cliente.',
    files: 'ficheiro',
    filesPlural: 'ficheiros',
    chosen: 'escolhida',
    chosenPlural: 'escolhidas',
    downloadAll: 'Descarregar tudo',
    downloadChosen: 'Descarregar escolhidas',
    chosenSuffix: 'escolhidas',
    cancel: 'Cancelar',
    exit: 'Sair',
    empty: 'Ainda não há ficheiros nesta galeria. Avisamos assim que estiverem prontos.',
    open: 'Abrir',
    download: 'Descarregar',
    choose: 'Escolher',
    unchoose: 'Retirar das escolhidas',
    close: 'Fechar',
    prev: 'Anterior',
    slideshow: 'Apresentação',
    stopSlideshow: 'Parar apresentação',
    next: 'Seguinte',
    zipWarning:
      'Esta galeria é grande e o ZIP é montado na memória do dispositivo, o que pode falhar em telemóveis. Preferem descarregar assim mesmo?',
    downloadFailed: 'O download falhou a meio. Os links podem ter expirado. Voltem a entrar.',
    downloadOneFailed: 'Não foi possível descarregar esse ficheiro. Voltem a entrar e tentem de novo.',
    favoriteFailed: 'Não foi possível guardar essa escolha. Voltem a entrar e tentem de novo.',
    availableUntil: (data: string) => `Esta galeria fica disponível até ${data}.`,
    lastDay: (data: string) =>
      `Último dia: esta galeria fecha amanhã (${data}). Descarreguem tudo o que quiserem guardar.`,
    closingIn: (dias: number, data: string) =>
      `Esta galeria fecha daqui a ${dias} dias, a ${data}. Descarreguem tudo o que quiserem guardar. Depois disso, os ficheiros deixam de estar acessíveis.`,
    viewGallery: 'Ver galeria',
    welcome: 'Bem-vindos',
    welcomeNamed: (nome: string) => `Bem-vindos, ${nome}`,
    tapToContinue: 'Toquem para avançar',
  },

  footer: {
    tagline:
      'Fotografia e vídeo para casamentos, gravidez e todos os teus momentos que merecem ser bem contados.',
    navLabel: 'Navegação',
    contactLabel: 'Contacto',
    rights: 'Todos os direitos reservados.',
    privacy: 'Privacidade',
    trade: 'Fotografia & Vídeo · Lisboa & Portalegre',
  },
}

// Sem `as const`: com ele cada texto ficava com o seu próprio tipo literal e a
// tradução inglesa não conseguia ser o mesmo tipo — "About" não é "Sobre".
export type Dict = typeof pt
