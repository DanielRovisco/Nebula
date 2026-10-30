import { Bath, BedDouble, Ruler, TrendingDown } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { PropertyImage } from "@/components/property-image";
import { CompareToggle, FavoriteButton } from "@/components/user-state";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { formatEur, formatPricePerM2 } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface CardData {
  id: string;
  propertyId?: string;
  reference: string;
  title: string;
  business: "sale" | "rent";
  price: number;
  pricePerM2?: number | null;
  dropPct?: number;
  type?: string;
  typology?: number | null;
  area?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parish?: string | null;
  municipality?: string | null;
  image: string | null;
  advertiserType?: "private" | "professional";
  verified?: boolean;
  publishedAt?: string;
  listingCount?: number;
}

interface Props {
  item: CardData;
  highlighted?: boolean;
  priority?: boolean;
  onHover?: (id: string | null) => void;
  className?: string;
  compact?: boolean;
}

export function PropertyCard({ item, highlighted, priority, onHover, className, compact }: Props) {
  const t = useTranslations();
  const f = useFormatter();
  const place = [item.parish, item.municipality].filter(Boolean).join(", ");
  const priceText = formatEur(item.price) + (item.business === "rent" ? t("common.perMonth") : "");
  return (
    <article
      onMouseEnter={onHover ? () => onHover(item.id) : undefined}
      onMouseLeave={onHover ? () => onHover(null) : undefined}
      data-listing-id={item.id}
      className={cn(
        "group relative overflow-hidden rounded-[16px] border bg-surface transition-[box-shadow,border-color] duration-200",
        highlighted ? "border-brand shadow-[var(--shadow-md)]" : "border-border hover:border-border-strong hover:shadow-[var(--shadow-md)]",
        className,
      )}
    >
      <div className={cn("relative overflow-hidden bg-surface-2", compact ? "aspect-[16/10]" : "aspect-[4/3]")}>
        <PropertyImage src={item.image} alt={t("property.illustrative")} priority={priority} className="size-full transition-transform duration-500 ease-out group-hover:scale-[1.03]" />
        <div className="absolute right-2.5 top-2.5 z-10 flex gap-1.5">
          <CompareToggle reference={item.reference} />
          {item.propertyId && <FavoriteButton propertyId={item.propertyId} />}
        </div>
        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
          {item.advertiserType === "private" && <Badge tone="brand">{t("common.private")}</Badge>}
          {item.verified && <Badge tone="neutral">{t("common.verified")}</Badge>}
          {!!item.dropPct && item.dropPct > 0 && (
            <Badge tone="up" className="bg-surface/95">
              <TrendingDown className="size-3" aria-hidden />
              {t("search.priceDropBadge", { pct: f.number(item.dropPct, { maximumFractionDigits: 0 }) })}
            </Badge>
          )}
        </div>
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="tnum text-xl font-semibold tracking-tight">{priceText}</p>
          {item.pricePerM2 ? <p className="tnum text-xs text-muted">{formatPricePerM2(item.pricePerM2)}</p> : null}
        </div>
        <h3 className="line-clamp-1 text-[15px] font-medium">
          <Link href={`/imovel/${item.reference.toLowerCase()}`} className="after:absolute after:inset-0 focus-visible:after:rounded-[16px]">
            {item.title}
          </Link>
        </h3>
        <p className="line-clamp-1 text-sm text-muted">{place}</p>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-sm text-muted" aria-label={item.title}>
          {item.typology != null && item.type !== "garage" && item.type !== "land" && (
            <li className="flex items-center gap-1.5">
              <BedDouble className="size-4" aria-hidden />
              {t("search.bedrooms", { count: item.typology })}
            </li>
          )}
          {item.bathrooms ? (
            <li className="flex items-center gap-1.5">
              <Bath className="size-4" aria-hidden />
              {item.bathrooms}
            </li>
          ) : null}
          {item.area ? (
            <li className="flex items-center gap-1.5">
              <Ruler className="size-4" aria-hidden />
              {t("search.area", { value: f.number(Math.round(item.area)) })}
            </li>
          ) : null}
        </ul>
        {!compact && (item.listingCount ?? 1) > 1 && (
          <p className="text-xs text-muted">{t("search.listingsMerged", { count: item.listingCount ?? 1 })}</p>
        )}
      </div>
    </article>
  );
}
