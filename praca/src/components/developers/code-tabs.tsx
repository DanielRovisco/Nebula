"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export interface Snippet {
  lang: string;
  label: string;
  code: string;
}

/** curl / JavaScript / Python tabs with a copy button. Keyboard-accessible (Radix Tabs). */
export function CodeTabs({ snippets }: { snippets: Snippet[] }) {
  const t = useTranslations("developers");
  return (
    <Tabs.Root defaultValue={snippets[0]?.lang} className="overflow-hidden rounded-[14px] border border-border bg-surface">
      <Tabs.List aria-label={t("examples")} className="flex border-b border-border bg-surface-2">
        {snippets.map((s) => (
          <Tabs.Trigger key={s.lang} value={s.lang} className="min-h-11 px-4 text-sm font-medium text-muted data-[state=active]:bg-surface data-[state=active]:text-fg">
            {s.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {snippets.map((s) => (
        <Tabs.Content key={s.lang} value={s.lang} className="relative">
          <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed"><code>{s.code}</code></pre>
          <button
            type="button"
            aria-label={t("copy")}
            className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(s.code);
                toast.success(t("copied"));
              } catch {
                /* select manually */
              }
            }}
          >
            <Copy className="size-4" aria-hidden />
          </button>
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
