import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { EntitlementRow } from "@/components/admin/admin-controls";
import { Badge } from "@/components/ui/badge";
import { sql } from "@/db";

export const dynamic = "force-dynamic";

export default async function AdminPlans({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const f = await getFormatter();
  const ents = await sql<{ plan: string; feature: string; limit_value: number | null; enabled: boolean }[]>`SELECT plan::text, feature, limit_value, enabled FROM entitlements ORDER BY feature, plan`;
  const features = [...new Set(ents.map((e) => e.feature))];
  const subs = await sql<{ id: string; plan: string; status: string; email: string | null; org: string | null; trial_ends_at: Date | null; seats: number }[]>`
    SELECT s.id, s.plan::text, s.status, u.email, o.name AS org, s.trial_ends_at, s.seats FROM subscriptions s LEFT JOIN users u ON u.id = s.user_id LEFT JOIN organizations o ON o.id = s.organization_id ORDER BY s.created_at DESC LIMIT 30`;
  return (
    <div className="space-y-10">
      <div><h1 className="font-display text-3xl font-medium">{t("plansTitle")}</h1><p className="mt-1 text-muted">{t("plansSub")}</p></div>
      <div className="overflow-x-auto rounded-[16px] border border-border bg-surface">
        <table className="w-full min-w-[720px] text-sm">
          <thead><tr className="border-b border-border text-left text-xs text-muted"><th scope="col" className="p-3 font-medium">{t("feature")}</th>{["free", "pro", "agency"].map((p) => <th key={p} scope="col" className="p-3 font-medium">{p}</th>)}</tr></thead>
          <tbody>
            {features.map((feat) => (
              <tr key={feat} className="border-b border-border last:border-0">
                <th scope="row" className="p-3 text-left font-medium">{feat}</th>
                {["free", "pro", "agency"].map((p) => { const e = ents.find((x) => x.plan === p && x.feature === feat); return <td key={p} className="p-3">{e ? <EntitlementRow plan={p} feature={feat} limit={e.limit_value} enabled={e.enabled} /> : "—"}</td>; })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section aria-labelledby="subs"><h2 id="subs" className="mb-3 text-lg font-semibold">{t("subs")}</h2>
        <ul className="divide-y divide-border rounded-[16px] border border-border bg-surface text-sm">
          {subs.map((s) => <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 p-3"><span>{s.org ?? s.email ?? "—"} <Badge tone="brand">{s.plan}</Badge> <Badge tone={s.status === "active" || s.status === "trialing" ? "up" : "outline"}>{s.status}</Badge> <span className="text-xs text-muted">{s.seats} lugar(es)</span></span>{s.trial_ends_at && <time className="text-xs text-muted" dateTime={s.trial_ends_at.toISOString()}>{f.dateTime(s.trial_ends_at, "short")}</time>}</li>)}
        </ul>
      </section>
    </div>
  );
}
