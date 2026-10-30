import { CheckSquare } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { TaskForm, TaskToggle } from "@/components/crm/crm-forms";
import { UpgradeGate } from "@/components/crm/upgrade-gate";
import { EmptyState } from "@/components/ui/states";
import { Link } from "@/i18n/navigation";
import { listTasks } from "@/server/crm";
import { crmContext } from "@/server/crm-gate";

export const dynamic = "force-dynamic";

export default async function TasksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { ctx, allowed, canWrite } = await crmContext();
  if (!allowed) return <UpgradeGate />;
  const t = await getTranslations("crm");
  const f = await getFormatter();
  const rows = await listTasks(ctx.orgId);
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-medium">{t("tasksTitle")}</h1>
      {canWrite && <TaskForm dealId={null} />}
      {rows.length === 0 ? <EmptyState icon={<CheckSquare className="size-6" aria-hidden />} title={t("tasksEmpty")} text={t("tasksEmptyText")} /> : (
        <ul className="divide-y divide-border rounded-[16px] border border-border bg-surface">
          {rows.map((k) => (
            <li key={k.id} className="flex items-center gap-3 p-3 text-sm">
              {canWrite ? <TaskToggle id={k.id} done={!!k.done_at} title={k.title} /> : <span className="size-5" />}
              <span className={k.done_at ? "text-muted line-through" : "font-medium"}>{k.title}</span>
              {k.deal_id && <Link href={`/crm/negocio/${k.deal_id}`} className="truncate text-xs text-brand hover:underline">{k.deal_title}</Link>}
              {k.due_at && <time className="tnum ml-auto text-xs text-muted" dateTime={k.due_at.toISOString()}>{f.dateTime(k.due_at, "short")}</time>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
