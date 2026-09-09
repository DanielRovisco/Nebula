import { CONTACT, SITE_URL, absoluteUrl } from './site'

/**
 * O negócio, em schema.org.
 *
 * Estava escrito à mão no `index.html`, com o domínio repetido cinco vezes —
 * era o último sítio onde mudar de domínio obrigava a editar URLs à mão.
 * Derivado do `SITE_URL`, acompanha o `site.config.json` como tudo o resto.
 *
 * Vai só na página inicial: o Google associa-o ao site inteiro a partir do
 * `@id`, e repeti-lo em cada página não acrescenta nada.
 */
export const businessJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': `${SITE_URL}/`,
  name: 'NEBULA',
  /*
    Esta é a frase que o Google associa ao negócio, e tinha ficado com o
    posicionamento antigo enquanto o site inteiro já dizia outra coisa. Nomeia
    os serviços e as zonas de propósito: é por essas palavras que alguém
    procura, e é aqui que se diz ao motor de busca o que somos.
  */
  description:
    'Fotografia e vídeo para casamentos, gravidez, retratos e eventos em Lisboa, Sintra e Portalegre. Galeria online privada e sneak peek em 24 horas.',
  url: `${SITE_URL}/`,
  logo: absoluteUrl('/brand/logo-symbol-white.png'),
  image: absoluteUrl('/brand/portfolio/hero-beach-dress-1440.webp'),
  email: CONTACT.email,
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: CONTACT.email,
    availableLanguage: ['Portuguese', 'English'],
  },
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Lisboa',
    addressRegion: 'Lisboa',
    addressCountry: 'PT',
  },
  /*
    As zonas onde se trabalha, e não uma lista de desejos. Sintra e Mem Martins
    entram porque é de lá que se sai: numa pesquisa local, o concelho conta mais
    do que o distrito, e quem procura escreve o nome da terra.
  */
  areaServed: ['Lisboa', 'Sintra', 'Mem Martins', 'Portalegre', 'Portugal'],
  serviceType: [
    'Fotografia de Casamentos',
    'Videografia de Casamentos',
    'Fotografia de Maternidade',
    'Fotografia de Eventos',
  ],
  sameAs: [CONTACT.instagram],
  // Faixa de preço em símbolos, que é o que o schema.org aceita sem valores.
  priceRange: '€€€',
}
