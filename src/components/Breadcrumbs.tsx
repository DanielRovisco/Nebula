import { Link } from 'react-router-dom'
import { useLink, useT } from '../lib/i18n'
import type { RouteKey } from '../lib/i18n'

/**
 * Migalhas: onde estou e como volto atrás.
 *
 * Servem duas coisas ao mesmo tempo. A quem chega de uma pesquisa direto a uma
 * página interior — que é a maioria — dizem que há mais site à volta. E ao
 * Google dão a hierarquia, que ele mostra nos resultados em vez do endereço
 * cru.
 *
 * O `BreadcrumbList` de dados estruturados é gerado a partir da mesma lista
 * (ver `breadcrumbJsonLd`), para não haver hipótese de o que se vê e o que se
 * declara divergirem.
 */
export interface Migalha {
  label: string
  to?: RouteKey
}

export default function Breadcrumbs({ items }: { items: Migalha[] }) {
  const t = useT()
  const link = useLink()

  return (
    <nav aria-label="Migalhas" className="mb-6">
      <ol className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-titanium/35">
        <li>
          <Link to={link('home')} className="hover:text-titanium/70 transition-colors">
            {t.nav.home}
          </Link>
        </li>
        {items.map((m) => (
          <li key={m.label} className="flex items-center gap-2">
            <span aria-hidden="true" className="text-titanium/20">
              /
            </span>
            {m.to ? (
              <Link to={link(m.to)} className="hover:text-titanium/70 transition-colors">
                {m.label}
              </Link>
            ) : (
              // A página atual não é um link para si própria.
              <span aria-current="page" className="text-titanium/60">
                {m.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
