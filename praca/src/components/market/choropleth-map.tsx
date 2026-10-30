import { getTranslations } from "next-intl/server";
import { binOf, CHORO_VARS, projectFeatures, quantileBreaks, type GeoFeature } from "@/lib/choropleth";
import { formatPricePerM2 } from "@/lib/format";
import { Link } from "@/i18n/navigation";

/** Server-rendered SVG heat map. Each polygon is a link to the child zone and carries a text alternative. */
export async function ChoroplethMap({ features, width = 640, height = 460 }: { features: GeoFeature[]; width?: number; height?: number }) {
  const t = await getTranslations("market");
  const values = features.map((f) => f.value).filter((v): v is number => v != null);
  const breaks = quantileBreaks(values, 5);
  const { paths, viewBox } = projectFeatures(features, width, height);
  const byKey = new Map(paths.map((p) => [p.key, p.d]));
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  return (
    <figure>
      <svg viewBox={viewBox} role="group" aria-label={t("mapTitle")} className="h-auto w-full">
        {features.map((f) => {
          const bin = binOf(f.value, breaks);
          const label = `${f.name}: ${f.value != null ? formatPricePerM2(f.value) : t("noValue")}`;
          return (
            <Link key={f.key} href={f.href} aria-label={label}>
              <path d={byKey.get(f.key)} fill={bin == null ? "var(--surface-2)" : CHORO_VARS[Math.min(bin, 4)]} stroke="var(--bg)" strokeWidth={0.8} strokeLinejoin="round" className="transition-opacity hover:opacity-80">
                <title>{label}</title>
              </path>
            </Link>
          );
        })}
      </svg>
      <figcaption className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
        <span>{t("mapLegend")}</span>
        <span className="flex items-center" aria-hidden>
          {CHORO_VARS.map((c) => (
            <span key={c} className="h-3 w-8 first:rounded-l last:rounded-r" style={{ background: c }} />
          ))}
        </span>
        {values.length > 0 && (
          <span className="tnum">
            {formatPricePerM2(min)} – {formatPricePerM2(max)}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-surface-2 ring-1 ring-border" aria-hidden />
          {t("noValue")}
        </span>
      </figcaption>
    </figure>
  );
}
