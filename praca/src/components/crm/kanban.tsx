"use client";

import { Euro, Link2, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { Select } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { formatEur } from "@/lib/format";
import { cn } from "@/lib/utils";
import { moveDeal } from "@/server/crm-actions";
import type { Stage } from "@/lib/crm-constants";
import type { DealRow } from "@/server/crm";

export function Kanban({ deals, stages, canWrite }: { deals: DealRow[]; stages: readonly Stage[]; canWrite: boolean }) {
  const t = useTranslations("crm");
  const router = useRouter();
  const [, start] = useTransition();
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  const [optimistic, apply] = useOptimistic(deals, (state, move: { id: string; stage: Stage }) => state.map((d) => (d.id === move.id ? { ...d, stage: move.stage } : d)));

  const move = (id: string, stage: Stage) =>
    start(async () => {
      apply({ id, stage });
      await moveDeal(id, stage);
      router.refresh();
    });

  return (
    <div className="grid gap-4 overflow-x-auto pb-4 lg:grid-cols-5" role="list">
      {stages.map((stage) => {
        const col = optimistic.filter((d) => d.stage === stage);
        const total = col.reduce((s, d) => s + (d.value ?? 0), 0);
        return (
          <section
            key={stage}
            role="listitem"
            aria-label={t(`stages.${stage}`)}
            onDragOver={(e) => {
              if (!canWrite) return;
              e.preventDefault();
              setOver(stage);
            }}
            onDragLeave={() => setOver((s) => (s === stage ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const id = e.dataTransfer.getData("text/plain") || dragging;
              if (id && canWrite) move(id, stage);
              setDragging(null);
            }}
            className={cn("min-h-64 min-w-60 rounded-[16px] border bg-surface-2/60 p-3 transition-colors", over === stage ? "border-brand bg-brand-soft/50" : "border-border")}
          >
            <header className="mb-3 flex items-baseline justify-between gap-2 px-1">
              <h2 className="text-sm font-semibold">{t(`stages.${stage}`)} <span className="font-normal text-muted">{col.length}</span></h2>
              {total > 0 && <span className="tnum text-xs text-muted">{formatEur(total)}</span>}
            </header>
            <ul className="space-y-2.5">
              {col.length === 0 && <li className="px-1 py-6 text-center text-xs text-muted">{t("emptyColumn")}</li>}
              {col.map((d) => (
                <li
                  key={d.id}
                  draggable={canWrite}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", d.id);
                    e.dataTransfer.effectAllowed = "move";
                    setDragging(d.id);
                  }}
                  onDragEnd={() => setDragging(null)}
                  className={cn("rounded-[12px] border border-border bg-surface p-3 shadow-[var(--shadow-sm)]", canWrite && "cursor-grab active:cursor-grabbing", dragging === d.id && "opacity-50")}
                >
                  <Link href={`/crm/negocio/${d.id}`} className="line-clamp-2 text-sm font-semibold hover:underline">{d.title ?? "—"}</Link>
                  <dl className="mt-1.5 space-y-0.5 text-xs text-muted">
                    {d.contactName && <div className="flex items-center gap-1.5"><User className="size-3.5" aria-hidden /><dt className="sr-only">{t("contact")}</dt><dd className="truncate">{d.contactName}</dd></div>}
                    {d.propertyRef && <div className="flex items-center gap-1.5"><Link2 className="size-3.5" aria-hidden /><dt className="sr-only">{t("property")}</dt><dd className="truncate">{d.propertyRef}</dd></div>}
                    {d.value != null && <div className="tnum flex items-center gap-1.5"><Euro className="size-3.5" aria-hidden /><dt className="sr-only">{t("value")}</dt><dd>{formatEur(d.value)}</dd></div>}
                  </dl>
                  {canWrite && (
                    <>
                      <label htmlFor={`mv-${d.id}`} className="sr-only">{t("moveTo", { title: d.title ?? "" })}</label>
                      <Select id={`mv-${d.id}`} className="mt-2 h-8 text-xs" value={d.stage} onChange={(e) => move(d.id, e.target.value as Stage)}>
                        {stages.map((s) => <option key={s} value={s}>{t(`stages.${s}`)}</option>)}
                      </Select>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
