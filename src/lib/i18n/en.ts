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
    addonLabel: 'Made to fit',
    addonTitle: 'Build your own package',
    addonText:
      'No package has to stay as it is. Add 4K film, drone, more hours or a second session. Tell us what you have in mind and we will price it.',
    items: {
      photoEditorial: 'Editorial photography',
      privateGallery: 'Private online gallery',
      sneakPeek: 'Sneak peek within 24h',
      photoVideo4k: 'Photography + 4K film',
      preWedding: 'Pre-wedding session included',
      drone: 'Drone coverage',
      photoSession: 'Photography session',
      photoVideoLifestyle: 'Photography + lifestyle film',
      coupleSession: 'Session for two',
      eventPhoto: 'Single-event photography coverage',
      eventPhotoVideo: 'Photography and film coverage',
    },
    packs: {
      essencia: 'Essence',
      origem: 'Origin',
      nebula: 'Nebula',
      cinemaFoto: 'Cinema & Photo',
      intimo: 'Intimate',
      editorial: 'Editorial',
      foto: 'Photo',
      fotoVideo: 'Photo + Film',
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
    updatedAt: '16 August 2026',
    sections: [
      {
        title: 'Who handles your data',
        paragraphs: [
          'The data collected on this site is handled by NEBULA, a photography and film service based in Portugal.',
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
        title: 'Who else touches it',
        paragraphs: [
          'For the site to work we rely on providers who handle data on our behalf and only on our instructions:',
        ],
        list: [
          'GitHub Pages: hosting for the site.',
          'Supabase: the gallery database and the login for our admin panel.',
          'Cloudflare R2: storage for photographs and films.',
          'Form delivery service: passes the message you write to our inbox.',
          'Cookie-free analytics tool: aggregate visit counts.',
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
