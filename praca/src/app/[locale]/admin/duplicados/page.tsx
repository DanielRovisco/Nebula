import { GitMerge } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DedupeButtons } from "@/components/admin/admin-controls";
import { PropertyImage } from "@/components/property-image";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { sql } from "@/db";
import { Link } from "@/i18n/navigation";
import { formatEur } from "@/lib/format";

export const dynamic = "force-dynamic";

type Side = { ref: string; title: string; price: number; area: number | null; typology: number | null; floor: number | null; address: string | null; image: string | null };

export default async function AdminDuplicates({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const rows = await sql<{ id: string; score: number; signals: Record<string, number>; a_ref: string; a_title: string; a_price: number; a_area: number | null; a_typ: number | null; a_floor: number | null; a_addr: string | null; a_img: string | null; b_ref: string; b_title: string | null; b_price: number | null; b_area: number | null; b_typ: number | null; b_floor: number | null; b_addr: string | null; b_img: string | null }[]>`
    SELECT d.id, d.score::float8 AS score, d.signals,
           pa.reference AS a_ref, l.title AS a_title, l.price::float8 AS a_price, pa.usable_area::float8 AS a_area, pa.typology AS a_typ, pa.floor AS a_floor, pa.address AS a_addr,
           (SELECT url FROM listing_media m WHERE m.listing_id = l.id ORDER BY position LIMIT 1) AS a_img,
           pb.reference AS b_ref, bl.title AS b_title, bl.price::float8 AS b_price, pb.usable_area::float8 AS b_area, pb.typology AS b_typ, pb.floor AS b_floor, pb.address AS b_addr,
           (SELECT url FROM listing_media m WHERE m.listing_id = bl.id ORDER BY position LIMIT 1) AS b_img
    FROM dedupe_candidates d JOIN listings l ON l.id = d.listing_id JOIN properties pa ON pa.id = l.property_id JOIN properties pb ON pb.id = d.candidate_property_id
    LEFT JOIN LATERAL (SELECT * FROM listings x WHERE x.property_id = pb.id ORDER BY is_primary DESC, published_at DESC LIMIT 1) bl ON true
    WHERE d.status = 'pending' ORDER BY d.score DESC LIMIT 50`;
  const card = (s: Side, label: string) => (
    <div className="flex gap-3">
      <div className="relative size-24 shrink-0 overflow-hidden rounded-[12px] bg-surface-2"><PropertyImage src={s.image} alt={s.title} className="size-full" sizes="96px" /></div>
      <div className="min-w-0 text-sm"><p className="text-xs text-muted">{label}</p><Link href={`/imovel/${s.ref.toLowerCase()}`} className="font-medium hover:underline">{s.ref}</Link><p className="line-clamp-1">{s.title}</p><p className="tnum text-muted">{formatEur(s.price)}{s.area ? ` · ${Math.round(s.area)} m²` : ""}{s.typology != null ? ` · T${s.typology}` : ""}{s.floor != null ? ` · ${s.floor}.º` : ""}</p><p className="line-clamp-1 text-xs text-muted">{s.address}</p></div>
    </div>
  );
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-medium">{t("dupTitle")}</h1>
      {rows.length === 0 ? <EmptyState icon={<GitMerge className="size-6" aria-hidden />} title={t("dupEmpty")} text={t("dupEmptyText")} /> : (
        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.id} className="rounded-[16px] border border-border bg-surface p-5">
              <div className="mb-4 flex flex-wrap items-center gap-2"><Badge tone="warn">{t("dupScore", { score: r.score })}</Badge>{Object.entries(r.signals).map(([k, v]) => <Badge key={k} tone="outline">{k} {Math.round(v * 100)}%</Badge>)}</div>
              <div className="grid gap-5 md:grid-cols-2">
                {card({ ref: r.a_ref, title: r.a_title, price: r.a_price, area: r.a_area, typology: r.a_typ, floor: r.a_floor, address: r.a_addr, image: r.a_img }, t("dupNew"))}
                {card({ ref: r.b_ref, title: r.b_title ?? "—", price: r.b_price ?? 0, area: r.b_area, typology: r.b_typ, floor: r.b_floor, address: r.b_addr, image: r.b_img }, t("dupExisting"))}
              </div>
              <div className="mt-4 border-t border-border pt-4"><DedupeButtons id={r.id} /></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
