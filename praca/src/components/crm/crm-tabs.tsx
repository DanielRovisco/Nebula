"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/crm", key: "deals" },
  { href: "/crm/contactos", key: "contacts" },
  { href: "/crm/tarefas", key: "tasks" },
  { href: "/crm/prospecao", key: "prospects" },
  { href: "/crm/partilhas", key: "shares" },
  { href: "/crm/webhooks", key: "webhooks" },
] as const;

export function CrmTabs() {
  const t = useTranslations("crm");
  const pathname = usePathname();
  return (
    <nav aria-label={t("title")} className="border-b border-border bg-surface">
      <ul className="mx-auto flex max-w-[1400px] gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:px-6">
        {TABS.map(({ href, key }) => {
          const active = href === "/crm" ? pathname === "/crm" || pathname.startsWith("/crm/negocio") : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className={cn("flex min-h-12 items-center whitespace-nowrap border-b-2 px-3 text-sm font-medium", active ? "border-brand text-brand" : "border-transparent text-muted hover:text-fg")}>
                {t(`tabs.${key}`)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
