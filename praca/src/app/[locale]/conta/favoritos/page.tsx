import { Heart } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DeleteFolderButton, FavoriteItemControls, NewFolderForm } from "@/components/account/favorite-controls";
import { PropertyCard } from "@/components/property-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { sql } from "@/db";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function FavoritesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ pasta?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const u = await requireUser();
  const t = await getTranslations("favorites");
  const { pasta } = await searchParams;
  const folders = await sql<{ id: string; name: string; n: number }[]>`
    SELECT f.id, f.name, (SELECT count(*)::int FROM favorites x WHERE x.folder_id = f.id) AS n FROM favorite_folders f WHERE f.user_id = ${u.id} ORDER BY f.created_at`;
  const validFolder = pasta && pasta !== "none" ? folders.find((f) => f.id === pasta)?.id : undefined;
  const filter = pasta === "none" ? sql`AND fv.folder_id IS NULL` : validFolder ? sql`AND fv.folder_id = ${validFolder}` : sql``;
  const rows = await sql<{ lid: string; property_id: string; reference: string; title: string; business: "sale" | "rent"; price: number; ppm: number | null; area: number | null; typology: number | null; parish: string | null; municipality: string | null; image: string | null; folder_id: string | null; note: string | null; status: string }[]>`
    SELECT l.id AS lid, p.id AS property_id, p.reference, l.title, l.business, l.price::float8 AS price, l.price_per_m2::float8 AS ppm, p.usable_area::float8 AS area, p.typology,
           pa.name AS parish, mu.name AS municipality, fv.folder_id, fv.note, l.status,
           (SELECT url FROM listing_media m WHERE m.listing_id = l.id ORDER BY position LIMIT 1) AS image
    FROM favorites fv JOIN properties p ON p.id = fv.property_id
    JOIN LATERAL (SELECT * FROM listings x WHERE x.property_id = p.id AND x.deleted_at IS NULL ORDER BY x.is_primary DESC, x.published_at DESC LIMIT 1) l ON true
    LEFT JOIN geo_parishes pa ON pa.code = p.parish_code LEFT JOIN geo_municipalities mu ON mu.code = p.municipality_code
    WHERE fv.user_id = ${u.id} AND p.deleted_at IS NULL ${filter} ORDER BY fv.created_at DESC`;
  const link = "flex min-h-10 items-center justify-between gap-2 rounded-[10px] px-3 text-sm";
  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[220px_1fr]">
      <aside className="space-y-4">
        <h1 className="font-display text-3xl font-medium">{t("title")}</h1>
        <nav aria-label={t("title")} className="space-y-1">
          <Link href="/conta/favoritos" className={cn(link, !pasta && "bg-brand-soft text-brand")}>{t("all")}</Link>
          <Link href="/conta/favoritos?pasta=none" className={cn(link, pasta === "none" && "bg-brand-soft text-brand")}>{t("noFolder")}</Link>
          {folders.map((f) => (
            <div key={f.id} className="flex items-center">
              <Link href={`/conta/favoritos?pasta=${f.id}`} className={cn(link, "flex-1", validFolder === f.id && "bg-brand-soft text-brand")}>
                <span className="truncate">{f.name}</span>
                <span className="tnum text-xs text-muted">{f.n}</span>
              </Link>
              {validFolder === f.id && <DeleteFolderButton id={f.id} />}
            </div>
          ))}
        </nav>
        <NewFolderForm />
      </aside>
      <section aria-live="polite">
        {rows.length === 0 ? (
          <EmptyState icon={<Heart className="size-6" aria-hidden />} title={t("empty")} text={t("emptyText")} action={<Button asChild><Link href="/comprar">{t("browse")}</Link></Button>} />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2">
            {rows.map((r) => (
              <li key={r.property_id}>
                <PropertyCard compact item={{ id: r.lid, propertyId: r.property_id, reference: r.reference, title: r.title, business: r.business, price: r.price, pricePerM2: r.ppm, area: r.area, typology: r.typology, parish: r.parish, municipality: r.municipality, image: r.image }} />
                <FavoriteItemControls propertyId={r.property_id} folderId={r.folder_id} note={r.note} folders={folders} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
