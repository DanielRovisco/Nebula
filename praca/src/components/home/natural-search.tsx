"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import type { NlSearchResponse } from "@/server/nl-search";

/** Free-text search: shows how the sentence was understood before the user opens the results. */
export function NaturalSearch() {
  const t = useTranslations("home");
  const router = useRouter();
  const id = useId();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<NlSearchResponse | null>(null);
  const [error, setError] = useState(false);

  async function interpret(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim().length < 3) return;
    setBusy(true);
    setError(false);
    try {
      const r = await fetch(`/api/nl-search?q=${encodeURIComponent(text.trim())}`);
      if (!r.ok) throw new Error(String(r.status));
      setRes((await r.json()) as NlSearchResponse);
    } catch {
      setRes(null);
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={interpret} role="search" aria-label={t("nlLabel")} className="mt-4 rounded-[20px] border border-border bg-surface p-3 sm:p-4">
      <label htmlFor={id} className="mb-2 flex items-center gap-2 text-sm font-medium">
        <Sparkles className="size-4 text-brand" aria-hidden />
        {t("nlLabel")}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={id}
          type="text"
          value={text}
          maxLength={240}
          onChange={(e) => {
            setText(e.target.value);
            setRes(null);
          }}
          placeholder={t("nlPlaceholder")}
          className="h-12 w-full rounded-[12px] border border-border-strong bg-bg px-4 text-base placeholder:text-muted/80 hover:border-fg/40 focus-visible:border-brand"
        />
        <Button type="submit" disabled={busy || text.trim().length < 3} className="shrink-0">
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {t("nlInterpret")}
        </Button>
      </div>
      <div aria-live="polite">
        {error && <p className="mt-3 text-sm text-down">{t("nlError")}</p>}
        {res && (
          <div className="mt-3">
            {res.chips.length === 0 ? (
              <p className="text-sm text-muted">{t("nlNothing")}</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5" aria-label={t("nlUnderstood")}>
                {res.chips.map((c) => (
                  <li key={c.key} className="rounded-full bg-brand-soft px-3 py-1 text-sm text-brand">
                    {c.label}
                  </li>
                ))}
              </ul>
            )}
            {res.placeNotFound && <p className="mt-2 text-sm text-warn">{t("nlPlaceNotFound", { place: res.placeNotFound })}</p>}
            {res.ignored.length > 0 && <p className="mt-2 text-sm text-muted">{t("nlIgnored", { items: res.ignored.join(", ") })}</p>}
            <Button type="button" className="mt-3" onClick={() => router.push(res.href)}>
              {t("nlOpen")}
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}
