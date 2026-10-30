import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import type { RiskAt } from "@/server/risk";

const tone = { high: "down", medium: "warn", low: "outline" } as const;

export async function RiskSection({ risks }: { risks: RiskAt[] }) {
  const t = await getTranslations("risk");
  if (!risks.length) return null;
  return (
    <section aria-labelledby="risk">
      <h2 id="risk" className="mb-3 text-xl font-semibold">{t("title")}</h2>
      <ul className="divide-y divide-border rounded-[16px] border border-border bg-surface">
        {risks.map((r) => (
          <li key={r.code} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="font-medium">{r.name}</p>
              <p className="text-xs text-muted">
                {r.source}
                {r.asOf ? ` · ${r.asOf}` : ""}
                {r.license ? ` · ${r.license}` : ""}
                {r.isSeed && <span className="text-warn"> · {t("demo")}</span>}
              </p>
            </div>
            {r.level ? <Badge tone={tone[r.level as keyof typeof tone] ?? "neutral"}>{r.levelLabel}</Badge> : <span className="text-muted">{t("outside")}</span>}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">{t("note")}</p>
    </section>
  );
}
