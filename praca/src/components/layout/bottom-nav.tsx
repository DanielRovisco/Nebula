"use client";

import { Home, Key, Search, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const items = [
    { href: "/", label: t("home"), icon: Home, match: (p: string) => p === "/" },
    { href: "/comprar", label: t("buy"), icon: Search, match: (p: string) => p.startsWith("/comprar") },
    { href: "/arrendar", label: t("rent"), icon: Key, match: (p: string) => p.startsWith("/arrendar") },
    { href: "/conta", label: t("account"), icon: User, match: (p: string) => p.startsWith("/conta") || p.startsWith("/entrar") },
  ];
  return (
    <nav
      aria-label={t("mobileNavigation")}
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {items.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn("flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium", active ? "text-brand" : "text-muted")}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
