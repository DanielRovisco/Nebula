"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin", key: "overview" },
  { href: "/admin/imoveis", key: "properties" },
  { href: "/admin/utilizadores", key: "users" },
  { href: "/admin/planos", key: "plans" },
  { href: "/admin/moderacao", key: "moderation" },
  { href: "/admin/duplicados", key: "duplicates" },
  { href: "/admin/fontes", key: "sources" },
  { href: "/admin/execucoes", key: "runs" },
] as const;

export function AdminTabs() {
  const t = useTranslations("admin");
  const pathname = usePathname();
  return (
    <nav aria-label={t("title")} className="border-b border-border bg-surface">
      <ul className="mx-auto flex max-w-[1300px] gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:px-6">
        {TABS.map(({ href, key }) => {
          const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
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
