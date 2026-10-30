import { Building2 } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { formatEur } from "@/lib/format";
import { listDevelopments, PHASES } from "@/server/developments";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "projects" });
  return { title: t("title"), description: t("sub") };
}

export default async function ProjectsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("projects");
  const f = await getFormatter();
  const all = await listDevelopments();
  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-24 pt-12 sm:px-6">
      <h1 className="font-display text-4xl font-medium sm:text-5xl">{t("title")}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">{t("sub")}</p>
      {all.some((d) => d.isSeed) && <p role="note" className="mt-4 rounded-[12px] bg-warn-soft p-3 text-sm text-warn">{t("demo")}</p>}
      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {PHASES.map((phase) => {
          const items = all.filter((d) => d.phase === phase);
          return (
            <section key={phase} aria-labelledby={`ph-${phase}`} className="rounded-[16px] bg-surface-2/60 p-3">
              <h2 id={`ph-${phase}`} className="mb-3 flex items-center justify-between px-1 text-sm font-semibold">
                {t(`phase.${phase}`)}
                <span className="tnum rounded-full bg-surface px-2 py-0.5 text-xs text-muted">{items.length}</span>
              </h2>
              <ul className="space-y-3">
                {items.length === 0 && <li className="px-1 py-3 text-sm text-muted">{t("none")}</li>}
                {items.map((d) => (
                  <li key={d.slug}>
                    <Link href={`/projetos/${d.slug}`} className="block rounded-[14px] border border-border bg-surface p-4 hover:border-fg/30">
                      <p className="flex items-start gap-2 font-semibold"><Building2 className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />{d.name}</p>
                      <p className="mt-1 text-sm text-muted">{d.developer}{d.municipality ? ` · ${d.municipality}` : ""}</p>
                      <dl className="mt-3 space-y-1 text-sm">
                        {d.priceFrom != null && <div className="flex justify-between gap-2"><dt className="text-muted">{t("from")}</dt><dd className="tnum font-medium">{formatEur(d.priceFrom)}</dd></div>}
                        {d.totalUnits != null && <div className="flex justify-between gap-2"><dt className="text-muted">{t("units")}</dt><dd className="tnum">{d.availableUnits ?? 0}/{d.totalUnits}</dd></div>}
                        {d.expectedDelivery && <div className="flex justify-between gap-2"><dt className="text-muted">{t("delivery")}</dt><dd>{f.dateTime(new Date(d.expectedDelivery), { month: "short", year: "numeric" })}</dd></div>}
                      </dl>
                      {d.isSeed && <Badge tone="warn" className="mt-3">{t("demoBadge")}</Badge>}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
