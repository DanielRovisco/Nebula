import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { formatEur } from "@/lib/format";
import type { FairPrice } from "@/lib/fair-price";

export async function FairPriceBadge({ fair, rent }: { fair: FairPrice; rent: boolean }) {
  const t = await getTranslations("fair");
  const pct = Math.round(Math.abs(fair.deviation) * 100);
  const tone = fair.verdict === "below" ? "up" : fair.verdict === "above" ? "down" : "outline";
  const suffix = rent ? "/mês" : "";
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <Badge tone={tone}>{t(fair.verdict)}</Badge>
      <span className="text-muted">
        {fair.verdict === "fair" ? t("insideRange", { low: formatEur(fair.low) + suffix, high: formatEur(fair.high) + suffix }) : t("deviation", { pct, dir: t(fair.deviation > 0 ? "dirAbove" : "dirBelow") })}
        {" · "}
        {t("basis", { n: fair.n })}
      </span>
    </div>
  );
}
