import type { Dict } from './pt'

/**
 * Site copy in English. Typed against the Portuguese dictionary: leave a key
 * out and the build fails, which is the only reliable way to stop the two
 * versions drifting apart as the site changes.
 *
 * Written for couples getting married in Portugal from abroad, so places are
 * named as an outsider would need them ("Portalegre, Alentejo"), not as we say
 * them between ourselves.
 */
export const en: Dict = {
  nav: {
    home: 'Home',
    about: 'About',
    services: 'Services',
    portfolio: 'Portfolio',
    gallery: 'Client gallery',
    contact: 'Contact',
    cta: 'Book a session',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    langLabel: 'Change language',
  },

  common: {
    backToSite: '← Back to the site',
    talkToUs: 'Get in touch',
    exploreMore: 'Explore',
    requestQuote: 'Request a quote',
    requestProposal: 'Request a proposal',
  },

  home: {
    seoTitle: 'NEBULA | Wedding Photography & Film in Portugal',
    seoDescription:
      'Wedding photographer and videographer in Lisbon and the Alentejo. Editorial photography and 4K cinematic film for weddings, maternity, portraits and events.',
    place: 'Lisbon & Portalegre',
    headline: ['Stories that stay', 'Forever'],
    heroCta: 'Book a session',
    heroNote: '2026 dates available',
    manifesto: ['Time passes.', 'The images stay'],
    servicesLabel: 'What we do',
    servicesTitle: 'Our services',
    servicesLink: 'See all services & pricing',
    services: {
      casamentos: { title: 'Weddings', tagline: 'Your love story, told to last.' },
      maternidade: { title: 'Maternity', tagline: 'Celebrating the wait. Keeping the beginning.' },
      retratos: { title: 'Portraits', tagline: 'Editorial, studio or outdoors. Who you are, in a frame.' },
      eventos: { title: 'Events', tagline: 'Coverage shaped around each occasion.' },
    },
    stats: {
      stories: 'Stories told',
      creators: 'Visual creators',
      allRound: 'Photo, film and content creation',
    },
    galleryLabel: 'Portfolio',
    galleryTitle: 'Moments captured',
    galleryLink: 'Full gallery',
    processLabel: 'How it works',
    processTitle: 'Simple, from start to finish',
    steps: [
      {
        title: 'First contact',
        desc: 'Send us a message on Instagram or by email. We reply within 24 hours.',
      },
      {
        title: 'Your session',
        desc: 'Wherever you choose, with full attention to the detail, the light and the feeling of the moment.',
      },
      {
        title: 'Your gallery',
        desc: 'A private online gallery with every edited image. Sneak peek within 24 hours of the session.',
      },
    ],
    ctaTitle: ['Shall we tell', 'your story?'],
    ctaButton: 'Get in touch',
    ctaInstagram: 'Instagram',
  },

  testimonials: {
    label: 'People we have worked with',
    title: 'What they say about us',
    previous: 'Previous testimonial',
    next: 'Next testimonial',
  },

  about: {
    seoTitle: 'About us | NEBULA Photography & Film',
    seoDescription:
      'Three visual creators between Lisbon and the Alentejo: editorial photography, 4K cinematic film and drone. Creativity, craft and honesty.',
    label: 'About us',
    title: 'Something new is born in every project.',
    quote: 'What can we do for you?',
    intro:
      'We are a team of three, working in film and photography with care and honesty. Every project is treated as its own, with the creativity and the precision it deserves. Based in Lisbon and Portalegre, we work across Portugal.',
    contactLink: 'Get in touch',
    valuesLabel: 'Values',
    valuesTitle: 'What guides us',
    teamLabel: 'Team',
    teamTitle: 'Who is behind it',
    instagramTitle: 'Follow our story',
    instagramText: 'Behind the scenes, recent work and everyday moments at',
    instagramCta: 'Instagram',
    values: {
      creativity: {
        title: 'Creativity',
        desc: 'Every project is its own story, never a formula repeated. We design each one from scratch.',
      },
      rigour: {
        title: 'Craft',
        desc: 'Professionalism in every detail, from the first message to the final delivery. No shortcuts.',
      },
      authenticity: {
        title: 'Honesty',
        desc: 'We capture what is really there. Genuine feeling in every frame, nothing staged.',
      },
    },
    team: {
      label: 'The team',
      daniel: { role: 'Videographer & Filmmaker', sub: 'Drone operator' },
      camila: { role: 'Photographer', sub: 'Editorial & maternity sessions' },
      patrick: { role: 'Photographer', sub: 'Weddings & events' },
    },
  },

  services: {
    seoTitle: 'Services & Packages | NEBULA Photography & Film',
    seoDescription:
      'Photography and film packages for weddings, maternity, portraits and events: 4K video, drone, pre-wedding, private online gallery and a 24-hour sneak peek.',
    label: 'Services',
    title: 'Made for your moment.',
    seeWork: 'See work in this category',
    inheritsFrom: (pack: string) => `Everything in ${pack}, plus`,
    addonLabel: 'Made to fit',
    addonTitle: 'Build your own package',
    addonText:
      'No package has to stay as it is. Add 4K film, drone, more hours or a second session. Tell us what you have in mind and we will price it.',
    mockup: {
      codigo: 'ana-e-tiago',
      casal: 'Ana & Tiago',
      data: '14 June 2025',
      frase: 'We want to see our day through the eyes of the people we love most. Share what you saw 🤍',
      botao: 'Choose photographs',
      limite: 'Photos and video, up to 500 MB each',
      nome: 'Your name, if you like',
      naGaleria: 'In the gallery',
    },
    galerias: {
      label: 'The delivery',
      titulo: 'The photographs live somewhere that is only yours.',
      texto: 'We do not send links that expire or folders shared with half the world. Every piece of work gets its own gallery, with its own address and password, where you download everything at once or pick photographs one by one, ready to print or to post.',
      pontos: [
        'An address and password that are only yours',
        'Download everything, or choose one by one',
        'No watermark, and no deadline to decide',
      ],
    },
    convidados: {
      label: 'On the day itself',
      titulo: 'And what your guests saw.',
      texto: 'The best photographs of the night are on the phones of the people who were there, and they end up lost in group chats. Every wedding of ours has its own code, printed and placed on the tables: anyone who scans it hands over the photographs they took, with nothing to install and no account to create.',
      pontos: [
        'Just point the camera at the code',
        'No apps, no accounts, no passwords',
        'You approve what goes into the gallery',
      ],
      cta: 'Talk to us about this',
    },
    packsLabel: 'What is included',
    packsTitulo: 'Choose where to start.',
    paginas: {
      casamentos: {
        seoTitle: 'Wedding Photographer | NEBULA',
        seoDescription:
          'Wedding photography and film in Lisbon, Sintra and Portalegre. A team of three, drone, guest gallery and first photographs within 24 hours.',
        intro:
          'A wedding happens once and never happens again. There is no second attempt, no running the plan twice, no asking the bride to walk in once more, and that is what makes it what it is. Which is exactly why there is a whole team on every one of those moments.',
        blocos: [
          {
            titulo: 'On the day',
            texto:
              'There are three of us: two photographers and one videographer. While one is with the bride getting ready, the other is with the groom, and nobody has to choose between two halves of the same morning. Several angles, for every feeling this day carries.',
          },
          {
            titulo: 'Photography and film, together',
            texto:
              'With photographers and a videographer on the same team, we work in step so that nothing about the day goes unrecorded. Each of us with a job of our own, and all of us with the same one: making that day last.',
          },
          {
            titulo: 'After the wedding',
            texto:
              'The next day you receive a first selection, to show the people who were there and the ones who could not come. The full set arrives in a private online gallery, with an address and password that are only yours, where you download everything at once or pick photographs one by one.',
          },
        ],
      },
      maternidade: {
        seoTitle: 'Maternity and Pregnancy Photography | NEBULA',
        seoDescription:
          'Maternity sessions in the studio or outdoors, in Lisbon, Sintra and Portalegre. Lifestyle photography and film, with a private online gallery.',
        intro:
          'A bump changes from one week to the next and then it is gone. A maternity session is not about being pregnant: it is about the short stretch where you are already a mother and still do not know the face of the person coming.',
        blocos: [
          {
            titulo: 'When to book',
            texto:
              'Between 28 and 34 weeks the bump shows well and the body is not yet heavy enough for a session to be tiring. Later is possible, but book with room to spare: from 36 weeks onwards the baby can always decide to bring everything forward.',
          },
          {
            titulo: 'Studio or outdoors',
            texto:
              'In the studio we control the light and the background, and the result is more editorial, cleaner, closer to a magazine. Outdoors you gain the place and the hour: late afternoon, the countryside, the beach. Neither is better; there is only what you want hanging on a wall ten years from now.',
          },
          {
            titulo: 'What you get',
            texto:
              'The chosen photographs, edited, in a private online gallery where you download whatever you like, ready to print or to post. Packages with video also include a short film, the kind you keep and watch again, and a vertical cut to share.',
          },
        ],
      },
      retratos: {
        seoTitle: 'Portraits and Photographic Books | NEBULA',
        seoDescription:
          'Editorial portraiture in the studio or outdoors, in Lisbon, Sintra and Portalegre. For personal branding, a book or yourself, with a private online gallery.',
        intro:
          'Most people do not like being photographed, and nearly always it is because they have never been photographed well. A portrait that works is not a matter of luck or of being photogenic: it is light, time and someone telling you what to do with your hands.',
        blocos: [
          {
            titulo: 'What a portrait is for',
            texto:
              'For a personal brand that needs a face, for the book of someone who works with their image, for a profile still carrying a photograph a friend took six years ago. And for none of that: some people sit for a portrait simply because they want a photograph of themselves they actually like, and that is as good a reason as any.',
          },
          {
            titulo: 'You do not need to know how to pose',
            texto:
              'If you find it difficult, do not worry, we help you with the posing: we say where to put your weight, where to look, what to do with your arms. In packages with preparation we talk before the day about clothes and references, so you arrive with everything already decided.',
          },
          {
            titulo: 'What you get',
            texto:
              'The edited photographs in a private online gallery, ready to print or to post, and to use anywhere.',
          },
        ],
      },
      eventos: {
        seoTitle: 'Event Photography | NEBULA',
        seoDescription:
          'Photography and video coverage for parties, birthdays and company events, in Lisbon, Sintra and Portalegre.',
        intro:
          'Birthdays, christenings, company dinners, launches. An event has no script the way a wedding does, so it has no fixed package either: tell us what you need and we take it from there.',
        blocos: [
          {
            titulo: 'Why there are no packages here',
            texto:
              'Every event is its own thing, and we would rather build the right service for each kind of event. A fixed package would mean promising the same hours and the same quantities to a company dinner and to a birthday party, which do not need the same. We would rather listen first and propose afterwards.',
          },
          {
            titulo: 'What we agree on',
            texto:
              'How many hours, how many of us, whether there is video as well as photography, and what really has to be on record. A company dinner wants the speeches and the group shots; a birthday wants the cake and the face of whoever blows it out. It is not the same job and it is not solved by the same plan.',
          },
          {
            titulo: 'A private gallery here too',
            texto:
              'The photographs arrive in an online gallery with its own address and password, where the company or the family downloads whatever they want. For company events, that settles the usual problem of emailing large files to ten different people.',
          },
        ],
      },
    },
    items: {
      photoEditorial: 'Editorial photography',
      horas6: '6 hours of coverage',
      horas8: '8 hours of coverage',
      fotos200: '200 to 300 edited photographs',
      fotos300: '300 to 500 edited photographs',
      diaCompleto: 'Full-day coverage',
      fotosTodas: 'Every selected photograph',
      verticalReels: 'Vertical film up to 1 minute for social media',
      entregaRapida: 'Priority delivery',
      privateGallery: 'Private online gallery',
      sneakPeek: 'Sneak peek within 24h',
      photoVideo4k: 'Photography + 4K film',
      preWedding: 'Pre-wedding session included',
      drone: 'Drone filming',
      team: 'A team of three: two photographers and one videographer',
      guestGallery: 'Online guest gallery',
      photoSession: 'Photography session',
      sessao1h: 'One hour, one outfit',
      sessao2h: 'Two hours, two outfits',
      sessao2h3roupas: 'Two hours, three outfits',
      fotos20a30: '20 to 30 edited photographs',
      fotos30a60: '30 to 60 edited photographs',
      localEscolha: 'Outdoors or in studio, your choice',
      preparacao: 'Planning beforehand: outfits and references',
      fotos10: '10 to 20 edited photographs',
      fotos20: '20 to 40 edited photographs',
      photoVideoLifestyle: 'Photography + lifestyle film',
      eventoCobertura: 'Photography coverage, with or without film',
      eventoCombinado: 'Hours and crew agreed with you',
    },
    packs: {
      essencia: 'Essence',
      origem: 'Origin',
      nebula: 'Nebula',
      medida: 'Made to measure',
    },
  },

  portfolio: {
    seoTitle: 'Portfolio | NEBULA Photography & Film',
    seoDescription:
      'Portraits, maternity sessions and weddings photographed by NEBULA in Lisbon, Portalegre and across Portugal.',
    label: 'Portfolio',
    title: 'Our work.',
    all: 'All',
    filterLabel: 'Filter portfolio by category',
    openLarge: 'View larger',
    cursorView: 'View',
    close: 'Close',
    prev: 'Previous photograph',
    next: 'Next photograph',
  },

  contact: {
    prefill: (servico: string, pack: string | null) =>
      pack
        ? `Hi! We would like a proposal for the ${pack} package, in ${servico}.\n\n`
        : `Hi! We would like a proposal for ${servico}.\n\n`,

    seoTitle: 'Contact | NEBULA Photography & Film',
    seoDescription:
      'Talk to us by email or Instagram about your wedding, maternity session, portraits or event. Lisbon and the Alentejo. We reply within 24 hours.',
    label: 'Contact',
    title: 'Let’s talk about your day.',
    replyTime: 'We reply within 24 hours',
    locationLabel: 'Based in',
    location: 'Lisbon & Portalegre, Portugal',
    how: 'We work by email and Instagram. That is where we answer fastest and where the conversation stays on record.',
    formTitle: 'Contact form',
    name: 'Name',
    email: 'Email',
    service: 'Service',
    date: 'Date of the event',
    location_: 'Location',
    optional: '(optional)',
    message: 'Message',
    messagePlaceholder:
      'Tell us what you have in mind: when, where, and what you would like to have at the end.',
    privacyNote:
      'By sending this, your details are used only to answer this enquiry. There is more in our',
    privacyLink: 'privacy policy',
    submit: 'Send message',
    draftRestored: 'We brought back what you had started writing.',
    errors: {
      name: 'Tell us your name.',
      email: 'That email does not look complete.',
      message: 'Write us a couple of lines about what you have in mind.',
      pastDate: 'That date has already passed.',
    },
    sending: 'Sending…',
    sentTitle: 'Message sent.',
    sentText: 'Thank you for writing. We will be in touch shortly.',
    mailtoTitle: 'One step left.',
    mailtoText: 'We have opened your email app with the message already written. Just press send.',
    mailtoFallback: 'Nothing opened? Write to us at',
    or: 'or by',
    instagramDm: 'Instagram',
    errorText: 'We could not send your message. Please write to us directly at',
    mailSubject: (servico: string, nome: string) => `${servico} enquiry: ${nome}`,
    mailBody: {
      name: 'Name',
      email: 'Email',
      service: 'Service',
      date: 'Date of the event',
      location: 'Location',
      undefined_: '(to be decided)',
    },
  },

  thanks: {
    seoTitle: 'Thank you | NEBULA',
    seoDescription: 'We have your message.',
    label: 'Received',
    title: 'Thank you. We have your message.',
    sent: 'We reply within 24 hours, usually well before that. If it is urgent, Instagram is the fastest way to reach us.',
    mailto: 'We opened your email app with the message written. All that is left is to press send. If nothing opened, write to us directly.',
    next: 'In the meantime',
    seePortfolio: 'See the portfolio',
    seeServices: 'Services & packages',
  },

  notFound: {
    seoTitle: 'Page not found | NEBULA',
    seoDescription: 'The page you are looking for does not exist or has moved.',
    label: 'Error 404',
    title: 'This page got lost in the dark.',
    text: 'That address does not exist, or it has moved. Here is the way back, and while you are here, what is actually worth seeing.',
    navLabel: 'Main pages',
    services: 'Services & pricing',
    clientArea: 'Client area',
  },

  privacy: {
    seoTitle: 'Privacy policy | NEBULA',
    seoDescription:
      'How NEBULA handles the personal data collected on this site: the contact form, private client galleries and cookie-free analytics.',
    label: 'Privacy',
    title: 'What we do with your data.',
    updated: 'Last updated:',
    updatedAt: '3 September 2026',
    sections: [
      {
        title: 'Who handles your data',
        paragraphs: [
          'The data collected on this site is handled by NEBULA, a photography and film service based in Portugal.',
          'Data controller: Daniel Rovisco, tax number 240055233, Rua António Silva, Bairro São Carlos, n.º 4, 3.º Dto., 2725-170 Mem Martins, Portugal.',
          'For anything to do with privacy, write to:',
        ],
      },
      {
        title: 'What we collect, and why',
        paragraphs: [
          'Contact form. Your name, email, the type of service and, if you give them, the date and location of the event, along with whatever you write. They are used only to reply to you and prepare a proposal. The legal basis is your own enquiry: without this we cannot answer you. While you type, the text is kept in your own browser so it is not lost if you leave the page; it is deleted the moment you send, and never leaves your device before that.',
          'Private galleries. When you are a client, we create a password-protected gallery with the photographs and films from your session. We store the name that titles the gallery, the photographs you mark as favourites, and a technical record of when it was opened and what was downloaded. That record exists so we know the delivery arrived and can spot unauthorised access; we do not store your IP address or any device identifier.',
          'Site analytics. We use a cookie-free analytics tool that counts visits in aggregate and anonymously. You cannot be identified from it, nobody is tracked across sites, and that is why this site does not bother you with a cookie banner.',
          'We do not collect sensitive data, we make no automated decisions about you, and we never sell or pass your data to third parties for commercial purposes.',
        ],
      },
      {
        title: 'Cookies and what your browser keeps',
        paragraphs: [
          'This site uses no cookies. Not ours, not third-party, none for advertising or cross-site tracking. That is why no consent banner ever appears: there is nothing to consent to.',
          'It does use your browser\u2019s own storage to remember things you asked for, which stay on your device and are never sent to us:',
        ],
        list: [
          'What you typed in the contact form, so it is not lost if you leave the page. Cleared the moment you send it.',
          'Your access to a gallery once you get the password right, so you do not have to type it again on every page. It lasts two hours at most and disappears when you close the tab.',
          'The gallery password, while you are there, only for the button that copies the sharing message. It also disappears when you close the tab.',
          'A note that you have already seen the opening animation, so it does not play on every visit.',
          'Two technical notes that let the site recover on its own when a file fails to load.',
        ],
        after:
          'None of it identifies you and none of it reaches us. You can delete all of it at any time by clearing the site data in your browser settings; the only consequence is having to type the gallery password again.',
      },
      {
        title: 'Who else touches it',
        paragraphs: [
          'For the site to work we rely on providers who handle data on our behalf and only on our instructions:',
        ],
        list: [
          'GitHub Pages: hosting for the site.',
          'Supabase: the gallery database and the login for our admin panel.',
          'Cloudflare R2: storage for photographs and films.',
          'Formspree: passes the message you write in the contact form to our inbox.',
          'Umami: aggregate visit counts, without cookies.',
        ],
        after:
          'Some of these providers are US-based and may process data outside the European Union, under the European Commission’s standard contractual clauses.',
      },
      {
        title: 'How long we keep it',
        paragraphs: [
          'Contact messages stay in our inbox for as long as the conversation lasts and, if it does not turn into work, for up to a year afterwards.',
          'Client galleries have an expiry date set at delivery, usually a few months, and we warn you before they close, so you have time to download everything. After that the gallery is closed and the files are deleted from our storage. We keep the original work for as long as is reasonable for our professional archive.',
        ],
      },
      {
        title: 'Photographs and image rights',
        paragraphs: [
          'The photographs and films we make are our own work, and it is each job’s contract that sets out what either side may do with them.',
          'We only publish images you appear in, whether in the portfolio, on the site or on social media, if you have agreed to it. If you change your mind, write to us and we will take them down from our channels as quickly as we can.',
        ],
      },
      {
        title: 'Your rights',
        paragraphs: [
          'You can ask us for access to your data, correction of anything wrong, deletion, restriction of processing, a machine-readable copy, or object to a particular use. Just write to us. We answer within one month:',
          'If you believe we have not handled it as we should, you have the right to complain to the Comissão Nacional de Proteção de Dados (CNPD), the supervisory authority in Portugal.',
        ],
      },
    ],
  },

  galleryAccess: {
    seoTitle: 'Client gallery | NEBULA',
    seoDescription: 'Access to your private NEBULA client gallery.',
    label: 'Client area',
    title: 'Your private gallery.',
    intro: 'Enter the code and password we sent you. If you do not have them to hand, just ask.',
    code: 'Gallery code',
    codePlaceholder: 'e.g. ana-e-tiago',
    password: 'Password',
    enter: 'Enter',
    checking: 'Checking…',
    wrong: 'Wrong code or password. After several failed attempts access is temporarily blocked. If you need us,',
    writeToUs: 'write to us',
    serverError: 'We cannot verify your access right now. Please try again shortly, or',
    talkToUs: 'get in touch',
    notConfiguredTitle: 'Galleries not configured',
    notConfigured: 'The Supabase variables are missing from this deploy, so access is unavailable. See the README.',
  },

  gallery: {
    seoDescription: 'Private client gallery.',
    files: 'file',
    filesPlural: 'files',
    chosen: 'chosen',
    chosenPlural: 'chosen',
    downloadAll: 'Download everything',
    downloadChosen: 'Download chosen',
    chosenSuffix: 'chosen',
    cancel: 'Cancel',
    exit: 'Sign out',
    empty: 'There are no files in this gallery yet. We will let you know as soon as they are ready.',
    open: 'Open',
    download: 'Download',
    choose: 'Choose',
    unchoose: 'Remove from your choices',
    close: 'Close',
    prev: 'Previous',
    slideshow: 'Slideshow',
    stopSlideshow: 'Stop slideshow',
    next: 'Next',
    zipWarning:
      'This gallery is large and the ZIP is assembled in your device memory, which can fail on phones. Would you like to download it anyway?',
    downloadFailed: 'The download failed part-way. The links may have expired. Please sign in again.',
    downloadOneFailed: 'We could not download that file. Please sign in again and try once more.',
    favoriteFailed: 'We could not save that choice. Please sign in again and try once more.',
    availableUntil: (data: string) => `This gallery is available until ${data}.`,
    lastDay: (data: string) =>
      `Last day: this gallery closes tomorrow (${data}). Please download anything you want to keep.`,
    closingIn: (dias: number, data: string) =>
      `This gallery closes in ${dias} days, on ${data}. Please download anything you want to keep. After that the files are no longer available.`,
    viewGallery: 'View gallery',
    welcome: 'Welcome',
    welcomeNamed: (nome: string) => `Welcome, ${nome}`,
    tapToContinue: 'Tap to continue',
  },

  footer: {
    tagline:
      'Photography and film for weddings, pregnancy and every moment of yours worth telling well.',
    navLabel: 'Navigation',
    contactLabel: 'Contact',
    rights: 'All rights reserved.',
    privacy: 'Privacy',
    trade: 'Photography & Film · Lisbon & Portalegre',
  },
}
