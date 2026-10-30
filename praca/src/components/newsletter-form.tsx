"use client";

import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";

export function NewsletterForm() {
  const t = useTranslations("newsletter");
  const locale = useLocale();
  const id = useId();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "done" | "invalid" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    try {
      const r = await fetch("/api/newsletter", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, locale: locale === "en" ? "en" : "pt", consent: true }) });
      setState(r.ok ? "done" : r.status === 400 ? "invalid" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") return <p role="status" className="rounded-[12px] bg-brand-soft p-4 text-sm text-brand">{t("done")}</p>;
  return (
    <form onSubmit={submit} aria-label={t("title")} className="space-y-3">
      <div>
        <Label htmlFor={`${id}-e`}>{t("email")}</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input id={`${id}-e`} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@exemplo.pt" />
          <Button type="submit" disabled={!consent || state === "busy"} className="shrink-0">
            {state === "busy" && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {t("subscribe")}
          </Button>
        </div>
      </div>
      <label className="flex items-start gap-2 text-xs text-muted">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]" />
        <span>
          {t("consent")} <Link href="/privacidade" className="underline">{t("privacy")}</Link>
        </span>
      </label>
      <div aria-live="polite">
        {state === "invalid" && <p className="text-sm text-down">{t("invalid")}</p>}
        {state === "error" && <p className="text-sm text-down">{t("error")}</p>}
      </div>
    </form>
  );
}
