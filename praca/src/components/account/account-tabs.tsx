"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/conta", key: "overview" },
  { href: "/conta/favoritos", key: "favorites" },
  { href: "/conta/pesquisas", key: "searches" },
  { href: "/conta/historico", key: "history" },
  { href: "/conta/avaliacoes", key: "valuations" },
  { href: "/conta/api", key: "api" },
] as const;

export function AccountTabs() {
  const t = useTranslations("account.tabs");
  const pathname = usePathname();
  if (pathname.startsWith("/conta/boas-vindas")) return null;
  return (
    <nav aria-label={t("label")} className="border-b border-border bg-surface">
      <ul className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:px-6">
        {TABS.map(({ href, key }) => {
          const active = href === "/conta" ? pathname === "/conta" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className={cn("flex min-h-12 items-center whitespace-nowrap border-b-2 px-3 text-sm font-medium", active ? "border-brand text-brand" : "border-transparent text-muted hover:text-fg")}>
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
