import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { sql } from "@/db";

export const dynamic = "force-dynamic";

export default async function AdminRuns({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const f = await getFormatter();
  const runs = await sql<{ id: string; source: string; status: string; started_at: Date; finished_at: Date | null; received: number; created: number; updated: number; merged: number; rejected: number }[]>`
    SELECT r.id, s.name AS source, r.status, r.started_at, r.finished_at, r.received, r.created, r.updated, r.merged, r.rejected FROM ingestion_runs r JOIN sources s ON s.id = r.source_id ORDER BY r.started_at DESC LIMIT 50`;
  const errors = await sql<{ id: string; external_id: string | null; stage: string; message: string; created_at: Date; source: string }[]>`
    SELECT e.id, e.external_id, e.stage, e.message, e.created_at, s.name AS source FROM ingestion_errors e JOIN ingestion_runs r ON r.id = e.run_id JOIN sources s ON s.id = r.source_id ORDER BY e.created_at DESC LIMIT 50`;
  const dur = (r: { started_at: Date; finished_at: Date | null }) => (r.finished_at ? `${Math.max(0, Math.round((r.finished_at.getTime() - r.started_at.getTime()) / 1000))} s` : "…");
  return (
    <div className="space-y-12">
      <section aria-labelledby="runs">
        <h1 id="runs" className="font-display text-3xl font-medium">{t("runsTitle")}</h1>
        {runs.length === 0 ? <p className="mt-4 text-muted">{t("runsEmpty")}</p> : (
          <div className="mt-6 overflow-x-auto rounded-[16px] border border-border bg-surface">
            <table className="w-full min-w-[760px] text-sm">
              <thead><tr className="border-b border-border text-left text-xs text-muted"><th scope="col" className="p-3 font-medium">{t("colSource")}</th><th scope="col" className="p-3 font-medium">{t("colStatus")}</th><th scope="col" className="p-3 font-medium">{t("colStarted")}</th><th scope="col" className="p-3 text-right font-medium">{t("colDuration")}</th><th scope="col" className="p-3 text-right font-medium">{t("colReceived")}</th><th scope="col" className="p-3 text-right font-medium">{t("colCreated")}</th><th scope="col" className="p-3 text-right font-medium">{t("colUpdated")}</th><th scope="col" className="p-3 text-right font-medium">{t("colMerged")}</th><th scope="col" className="p-3 text-right font-medium">{t("colRejected")}</th></tr></thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <th scope="row" className="p-3 text-left font-medium">{r.source}</th>
                    <td className="p-3"><Badge tone={r.status === "success" ? "up" : r.status === "partial" ? "warn" : r.status === "running" ? "brand" : "down"}>{r.status}</Badge></td>
                    <td className="tnum p-3 text-muted">{f.dateTime(r.started_at, { dateStyle: "short", timeStyle: "short" })}</td>
                    <td className="tnum p-3 text-right text-muted">{dur(r)}</td>
                    {[r.received, r.created, r.updated, r.merged, r.rejected].map((n, i) => <td key={i} className="tnum p-3 text-right">{n}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section aria-labelledby="errs">
        <h2 id="errs" className="mb-3 text-lg font-semibold">{t("errorsTitle")}</h2>
        {errors.length === 0 ? <p className="text-sm text-muted">{t("noErrors")}</p> : (
          <ul className="divide-y divide-border rounded-[16px] border border-border bg-surface text-sm">
            {errors.map((e) => <li key={e.id} className="flex flex-wrap items-start justify-between gap-2 p-3"><span><Badge tone="outline">{e.stage}</Badge> <span className="font-medium">{e.external_id ?? "—"}</span> <span className="text-muted">{e.message}</span><span className="block text-xs text-muted">{e.source}</span></span><time className="tnum text-xs text-muted" dateTime={e.created_at.toISOString()}>{f.dateTime(e.created_at, { dateStyle: "short", timeStyle: "short" })}</time></li>)}
          </ul>
        )}
      </section>
    </div>
  );
}
