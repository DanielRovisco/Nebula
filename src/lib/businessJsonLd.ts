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
  description:
    'Produtora audiovisual especializada em fotografia editorial e vídeo cinematográfico para casamentos, maternidade, retratos e eventos.',
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
  areaServed: ['Lisboa', 'Portalegre', 'Portugal'],
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
