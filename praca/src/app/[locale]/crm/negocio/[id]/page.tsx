import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { NoteForm, TaskForm, TaskToggle } from "@/components/crm/crm-forms";
import { UpgradeGate } from "@/components/crm/upgrade-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { formatEur } from "@/lib/format";
import { getDeal } from "@/server/crm";
import { crmContext } from "@/server/crm-gate";

export const dynamic = "force-dynamic";

export default async function DealPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { ctx, allowed, canWrite } = await crmContext();
  if (!allowed) return <UpgradeGate />;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const data = await getDeal(ctx.orgId, id); // scoped by organisation: ids from other tenants resolve to nothing
  if (!data) notFound();
  const t = await getTranslations("crm");
  const f = await getFormatter();
  const { deal, contact, notes, tasks, history } = data;
  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-8 sm:px-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3"><Link href="/crm">← {t("back")}</Link></Button>
        <h1 className="mt-1 font-display text-3xl font-medium">{deal.title ?? t("dealTitleDetail")}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm"><Badge tone="brand">{t(`stages.${deal.stage}`)}</Badge>{deal.value != null && <span className="tnum">{formatEur(deal.value)}</span>}{deal.commission_pct != null && <span className="text-muted">{t("commission")} {deal.commission_pct}%</span>}</p>
        <dl className="mt-3 grid gap-x-8 text-sm sm:grid-cols-2">
          {contact && <div className="flex justify-between border-b border-border py-2"><dt className="text-muted">{t("contact")}</dt><dd className="font-medium">{contact.name}{contact.email && <span className="block text-xs font-normal text-muted">{contact.email}</span>}</dd></div>}
          {deal.ref && <div className="flex justify-between border-b border-border py-2"><dt className="text-muted">{t("property")}</dt><dd><Link href={`/imovel/${deal.ref.toLowerCase()}`} className="font-medium text-brand hover:underline">{deal.ref}</Link></dd></div>}
        </dl>
      </div>
      <section aria-labelledby="tk"><h2 id="tk" className="mb-3 text-lg font-semibold">{t("tasks")}</h2>
        {tasks.length === 0 ? <p className="mb-3 text-sm text-muted">{t("noTasks")}</p> : <ul className="mb-3 divide-y divide-border rounded-[12px] border border-border bg-surface">{tasks.map((k) => <li key={k.id} className="flex items-center gap-3 p-3 text-sm"><TaskToggle id={k.id} done={!!k.done_at} title={k.title} /><span className={k.done_at ? "text-muted line-through" : ""}>{k.title}</span>{k.due_at && <span className="tnum ml-auto text-xs text-muted">{f.dateTime(k.due_at, "short")}</span>}</li>)}</ul>}
        {canWrite && <TaskForm dealId={id} />}
      </section>
      <section aria-labelledby="nt"><h2 id="nt" className="mb-3 text-lg font-semibold">{t("notes")}</h2>
        {canWrite && <NoteForm dealId={id} />}
        {notes.length === 0 ? <p className="mt-3 text-sm text-muted">{t("noNotes")}</p> : <ul className="mt-4 space-y-3">{notes.map((n) => <li key={n.id} className="rounded-[12px] border border-border bg-surface p-3 text-sm"><p className="whitespace-pre-line">{n.body}</p><p className="mt-1.5 text-xs text-muted">{n.author ?? "—"} · {f.dateTime(n.created_at, { dateStyle: "short", timeStyle: "short" })}</p></li>)}</ul>}
      </section>
      <section aria-labelledby="hs"><h2 id="hs" className="mb-3 text-lg font-semibold">{t("history")}</h2>
        {history.length === 0 ? <p className="text-sm text-muted">{t("noHistory")}</p> : <ul className="divide-y divide-border rounded-[12px] border border-border bg-surface text-sm">{history.map((h) => <li key={h.id} className="flex flex-wrap justify-between gap-2 p-3"><span><code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">{h.action}</code> <span className="text-muted">{h.name ?? ""} {h.meta && "to" in h.meta ? `→ ${t(`stages.${String(h.meta.to) as "new"}`)}` : ""}</span></span><time className="tnum text-xs text-muted" dateTime={h.created_at.toISOString()}>{f.dateTime(h.created_at, { dateStyle: "short", timeStyle: "short" })}</time></li>)}</ul>}
      </section>
    </div>
  );
}
