"use client";

import { Pause, Play, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { deleteSavedSearch, updateAlert } from "@/server/saved-searches";

export function AlertControls({ alertId, searchId, frequency, active }: { alertId: string; searchId: string; frequency: "instant" | "daily" | "weekly"; active: boolean }) {
  const t = useTranslations("alerts");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`f-${alertId}`}>{t("saveFrequency")}</label>
      <Select
        id={`f-${alertId}`}
        className="h-9 w-auto text-sm"
        defaultValue={frequency}
        onChange={(e) => start(async () => { await updateAlert(alertId, { frequency: e.target.value as typeof frequency }); router.refresh(); })}
      >
        <option value="instant">{t("freqInstant")}</option>
        <option value="daily">{t("freqDaily")}</option>
        <option value="weekly">{t("freqWeekly")}</option>
      </Select>
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await updateAlert(alertId, { active: !active });
            if (!r.ok && "error" in r) toast.error(t("limitQuota", { limit: "" }));
            router.refresh();
          })
        }
      >
        {active ? <Pause aria-hidden /> : <Play aria-hidden />}
        {active ? t("pause") : t("resume")}
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => { await deleteSavedSearch(searchId); router.refresh(); })}>
        <Trash2 aria-hidden />
        {t("delete")}
      </Button>
    </div>
  );
}
