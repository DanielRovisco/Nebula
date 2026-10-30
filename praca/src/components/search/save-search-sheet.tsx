"use client";

import { Bell, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Link } from "@/i18n/navigation";
import { saveSearch, type SaveSearchResult } from "@/server/saved-searches";
import { cn } from "@/lib/utils";

type Trig = "new_listing" | "price_drop" | "back_on_market" | "sold_or_withdrawn";
type Freq = "instant" | "daily" | "weekly";

interface Props {
  business: "sale" | "rent";
  qs: string;
  geoSlugs: { district?: string; municipality?: string; parish?: string };
  defaultName: string;
}

export function SaveSearchSheet({ business, qs, geoSlugs, defaultName }: Props) {
  const t = useTranslations("alerts");
  const c = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [frequency, setFrequency] = useState<Freq>("daily");
  const [triggers, setTriggers] = useState<Trig[]>(["new_listing", "price_drop"]);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<SaveSearchResult | null>(null);

  const toggle = (x: Trig) => setTriggers((s) => (s.includes(x) ? s.filter((y) => y !== x) : [...s, x]));
  const trigs: [Trig, string][] = [["new_listing", t("trigNew")], ["price_drop", t("trigDrop")], ["back_on_market", t("trigBack")], ["sold_or_withdrawn", t("trigSold")]];
  const freqs: [Freq, string][] = [["instant", t("freqInstant")], ["daily", t("freqDaily")], ["weekly", t("freqWeekly")]];

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setName(defaultName);
          setResult(null);
        }
      }}
    >
      <SheetTrigger asChild>
        <Button variant="secondary" size="sm" className="shrink-0">
          <Bell aria-hidden />
          <span className="max-sm:sr-only">{t("saveTitle").split(" e ")[0]}</span>
        </Button>
      </SheetTrigger>
      <SheetContent title={t("saveTitle")} closeLabel={c("close")}>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            const r = await saveSearch({ name, business, qs, geoSlugs, frequency, triggers });
            setPending(false);
            setResult(r);
            if (r.ok) {
              toast.success(t("saved"));
              setOpen(false);
            }
          }}
        >
          <div className="flex-1 space-y-6 overflow-y-auto p-5">
            <div>
              <Label htmlFor="ss-name">{t("saveName")}</Label>
              <Input id="ss-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">{t("saveFrequency")}</legend>
              <div className="flex flex-wrap gap-2">
                {freqs.map(([v, label]) => (
                  <label key={v} className={cn("flex min-h-10 cursor-pointer items-center rounded-full border px-4 text-sm font-medium", frequency === v ? "border-brand bg-brand-soft text-brand" : "border-border-strong")}>
                    <input type="radio" name="freq" value={v} checked={frequency === v} onChange={() => setFrequency(v)} className="sr-only" />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">{t("saveTriggers")}</legend>
              <div className="space-y-2">
                {trigs.map(([v, label]) => (
                  <label key={v} className="flex min-h-10 cursor-pointer items-center gap-3 text-sm">
                    <input type="checkbox" checked={triggers.includes(v)} onChange={() => toggle(v)} className="size-5 accent-[var(--brand)]" />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            {result && !result.ok && (
              <p role="alert" className="rounded-[12px] bg-down/10 p-3 text-sm text-down">
                {result.error === "auth" ? (
                  <>
                    {t("needLogin")}{" "}
                    <Link href="/entrar" className="font-medium underline">{t("signIn")}</Link>
                  </>
                ) : result.error === "quota" ? (
                  <>
                    {t("limitQuota", { limit: result.limit ?? 0 })}{" "}
                    <Link href="/planos" className="font-medium underline">{t("upgrade")}</Link>
                  </>
                ) : result.error === "plan" ? (
                  <>
                    {t("limitPlan")} <Link href="/planos" className="font-medium underline">{t("upgrade")}</Link>
                  </>
                ) : (
                  t("invalid")
                )}
              </p>
            )}
          </div>
          <div className="border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button type="submit" className="w-full" disabled={pending || triggers.length === 0}>
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              {t("saveCta")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
