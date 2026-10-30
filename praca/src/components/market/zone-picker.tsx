"use client";

import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";
import type { Suggestion } from "@/server/geo";

interface Zone {
  code: string;
  name: string;
}

export function ZonePicker({ zones, mode }: { zones: Zone[]; mode: "index" | "abs" }) {
  const t = useTranslations("market.analytics");
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);

  const go = (codes: string[]) => {
    const p = new URLSearchParams();
    if (codes.length) p.set("z", codes.join(","));
    if (mode === "abs") p.set("m", "abs");
    router.replace(`/mercado/analitica${p.size ? `?${p}` : ""}`);
  };

  useEffect(() => {
    if (q.trim().length < 2) return setItems([]);
    const ctl = new AbortController();
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`/api/geo/suggest?q=${encodeURIComponent(q)}`, { signal: ctl.signal });
        const d = (await r.json()) as { items: Suggestion[] };
        setItems(d.items.filter((i) => i.code));
      } catch {
        /* aborted */
      }
    }, 160);
    return () => {
      clearTimeout(id);
      ctl.abort();
    };
  }, [q]);

  return (
    <div>
      <ul className="flex flex-wrap gap-2" aria-label={t("pickLabel")}>
        {zones.map((z, i) => (
          <li key={z.code}>
            <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border-strong bg-surface pl-3 pr-1 text-sm font-medium">
              <span className="size-2.5 rounded-full" style={{ background: `var(--d${i + 1})` }} aria-hidden />
              {z.name}
              <button type="button" aria-label={t("remove", { name: z.name })} className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-surface-2" onClick={() => go(zones.filter((x) => x.code !== z.code).map((x) => x.code))}>
                <X className="size-4" aria-hidden />
              </button>
            </span>
          </li>
        ))}
      </ul>
      {zones.length < 4 ? (
        <div className="relative mt-3 max-w-md">
          <label htmlFor="zp" className="sr-only">{t("pickLabel")}</label>
          <Plus className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input id="zp" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("pickHint")} className="pl-9" autoComplete="off" aria-controls={listId} />
          {items.length > 0 && (
            <ul id={listId} className="absolute inset-x-0 top-[calc(100%+4px)] z-20 max-h-64 overflow-auto rounded-[14px] border border-border bg-surface p-1.5 shadow-[var(--shadow-lg)]">
              {items.map((s) => (
                <li key={s.code}>
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-center justify-between gap-3 rounded-[10px] px-3 text-left text-sm hover:bg-brand-soft"
                    onClick={() => {
                      setQ("");
                      setItems([]);
                      go([...zones.map((x) => x.code), s.code!]);
                    }}
                  >
                    <span className="font-medium">{s.label}</span>
                    <span className="text-xs text-muted">{s.sublabel}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted">{t("pickMax")}</p>
      )}
    </div>
  );
}
