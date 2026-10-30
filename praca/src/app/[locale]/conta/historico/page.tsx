import { History } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PropertyCard } from "@/components/property-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { sql } from "@/db";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function HistoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const u = await requireUser();
  const t = await getTranslations("favorites");
  const rows = await sql<{ id: string; property_id: string; reference: string; title: string; business: "sale" | "rent"; price: number; ppm: number | null; area: number | null; typology: number | null; parish: string | null; municipality: string | null; image: string | null }[]>`
    SELECT l.id, p.id AS property_id, p.reference, l.title, l.business, l.price::float8 AS price, l.price_per_m2::float8 AS ppm, p.usable_area::float8 AS area, p.typology,
           pa.name AS parish, mu.name AS municipality,
           (SELECT url FROM listing_media m WHERE m.listing_id = l.id ORDER BY position LIMIT 1) AS image
    FROM property_views v JOIN properties p ON p.id = v.property_id
    JOIN LATERAL (SELECT * FROM listings x WHERE x.property_id = p.id AND x.deleted_at IS NULL ORDER BY x.is_primary DESC, x.published_at DESC LIMIT 1) l ON true
    LEFT JOIN geo_parishes pa ON pa.code = p.parish_code LEFT JOIN geo_municipalities mu ON mu.code = p.municipality_code
    WHERE v.user_id = ${u.id} AND p.deleted_at IS NULL ORDER BY v.viewed_at DESC LIMIT 48`;
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-medium">{t("history")}</h1>
      {rows.length === 0 ? (
        <EmptyState icon={<History className="size-6" aria-hidden />} title={t("history")} text={t("historyEmpty")} action={<Button asChild><Link href="/comprar">{t("browse")}</Link></Button>} />
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <li key={r.id}>
              <PropertyCard compact item={{ id: r.id, propertyId: r.property_id, reference: r.reference, title: r.title, business: r.business, price: r.price, pricePerM2: r.ppm, area: r.area, typology: r.typology, parish: r.parish, municipality: r.municipality, image: r.image }} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
