import { User } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { auth } from "@/auth";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";
import { ThemeToggle } from "./theme-toggle";

async function AccountLink() {
  const t = await getTranslations("nav");
  let session = null;
  try {
    session = await auth();
  } catch {
    session = null; // DB unavailable: render the signed-out header rather than failing the whole page
  }
  if (session?.user) {
    return (
      <Button asChild variant="secondary" size="sm">
        <Link href="/conta">
          <User aria-hidden />
          <span className="max-sm:sr-only">{session.user.name ?? t("account")}</span>
        </Link>
      </Button>
    );
  }
  return (
    <Button asChild size="sm">
      <Link href="/entrar">{t("signIn")}</Link>
    </Button>
  );
}

export async function Header() {
  const t = await getTranslations("nav");
  const link = "rounded-full px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg";
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-4 sm:px-6">
        <Link href="/" aria-label={`Praça — ${t("home")}`} className="rounded-lg">
          <Logo />
        </Link>
        <nav aria-label={t("mainNavigation")} className="ml-4 hidden items-center gap-1 md:flex">
          <Link href="/comprar" className={link}>
            {t("buy")}
          </Link>
          <Link href="/arrendar" className={link}>
            {t("rent")}
          </Link>
          <Link href="/mercado" className={link}>
            {t("market")}
          </Link>
          <Link href="/calculadoras" className={link}>
            {t("calculators")}
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <Suspense fallback={null}>
            <LocaleSwitcher />
          </Suspense>
          <ThemeToggle />
          <Suspense fallback={<div className="h-9 w-20" />}>
            <AccountLink />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
