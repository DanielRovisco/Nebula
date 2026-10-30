import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { SourceActions, SourceForm, UploadForm } from "@/components/admin/admin-controls";
import { Badge } from "@/components/ui/badge";
import { sql } from "@/db";
import { SOURCE_STUBS } from "@/ingestion/adapters/stubs";

export const dynamic = "force-dynamic";

export default async function AdminSources({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const f = await getFormatter();
  const sources = await sql<{ id: string; name: string; kind: string; format: string | null; licence: string; endpoint: string | null; enabled: boolean; last_run_at: Date | null; is_seed: boolean; frequency_minutes: number | null; n: number }[]>`
    SELECT s.id, s.name, s.kind::text AS kind, s.format, s.licence, s.endpoint, s.enabled, s.last_run_at, s.is_seed, s.frequency_minutes,
           (SELECT count(*)::int FROM listings l WHERE l.source_id = s.id AND l.status = 'active') AS n FROM sources s ORDER BY s.is_seed, s.name`;
  const real = sources.filter((s) => !s.is_seed);
  return (
    <div className="space-y-12">
      <h1 className="font-display text-3xl font-medium">{t("srcTitle")}</h1>
      <section aria-label={t("srcTitle")}>
        <ul className="divide-y divide-border rounded-[16px] border border-border bg-surface">
          {sources.map((s) => (
            <li key={s.id} className="space-y-2 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0"><p className="font-medium">{s.name} {s.is_seed && <Badge tone="warn">seed</Badge>} <Badge tone={s.enabled ? "up" : "outline"}>{s.enabled ? "on" : "off"}</Badge> <Badge tone="neutral">{s.kind}{s.format ? ` · ${s.format}` : ""}</Badge></p>
                  <p className="tnum text-xs text-muted">{s.n} anúncios ativos · {t("srcLast")}: {s.last_run_at ? f.dateTime(s.last_run_at, { dateStyle: "short", timeStyle: "short" }) : t("srcNever")}{s.frequency_minutes ? ` · ${s.frequency_minutes} min` : ""}</p></div>
                {!s.is_seed && <SourceActions id={s.id} enabled={s.enabled} hasEndpoint={!!s.endpoint} />}
              </div>
              <p className="text-xs text-muted">{s.licence}</p>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="new"><h2 id="new" className="mb-4 text-lg font-semibold">{t("srcNew")}</h2><SourceForm /></section>
      {real.length > 0 && <section aria-labelledby="up"><h2 id="up" className="mb-4 text-lg font-semibold">{t("srcUpload")}</h2><UploadForm sources={real.map((s) => ({ id: s.id, name: s.name, format: s.format }))} /></section>}
      <section aria-labelledby="stubs">
        <h2 id="stubs" className="mb-3 text-lg font-semibold">{t("stubsTitle")}</h2>
        <ul className="divide-y divide-border rounded-[16px] border border-border bg-surface text-sm">
          {SOURCE_STUBS.map((s) => <li key={s.id} className="flex flex-wrap items-start justify-between gap-2 p-4"><div><p className="font-medium">{s.name}</p><p className="text-xs text-muted">{s.needs}</p></div><Badge tone="outline">{t(`stubStatus.${s.status}`)}</Badge></li>)}
        </ul>
      </section>
    </div>
  );
}
