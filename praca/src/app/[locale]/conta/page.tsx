import { BadgeCheck, Download, LogOut, Trash2 } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteAccount, signOutAction } from "@/server/account";

export const dynamic = "force-dynamic";

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) redirect("/entrar");
  const [u] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
  if (!u?.onboardedAt) redirect("/conta/boas-vindas");
  const t = await getTranslations("account");
  const a = await getTranslations("auth");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl font-medium">{a("welcome", { name: u.name ?? "" })}</h1>
      <p className="mt-1 text-muted">{u.email}</p>

      <section className="mt-8 grid gap-4 sm:grid-cols-2" aria-label={t("title")}>
        <div className="rounded-[16px] border border-border bg-surface p-5">
          <h2 className="text-sm text-muted">{t("profile")}</h2>
          <p className="mt-1 text-lg font-semibold">{a(`profile.${u.profileType}`)}</p>
          {(u.profileType === "agent" || u.profileType === "agency") && (
            <p className="mt-2 flex items-center gap-2 text-sm">
              <BadgeCheck className="size-4 text-brand" aria-hidden />
              {t(`amiStatus.${u.amiStatus}`)}
              {u.amiNumber && <Badge tone="outline">AMI {u.amiNumber}</Badge>}
            </p>
          )}
        </div>
        <div className="rounded-[16px] border border-border bg-surface p-5">
          <h2 className="text-sm text-muted">{t("plan")}</h2>
          <p className="mt-1 text-lg font-semibold">{t("planFree")}</p>
        </div>
      </section>

      <section className="mt-6 rounded-[16px] border border-dashed border-border-strong p-5">
        <h2 className="font-semibold">{t("soonTitle")}</h2>
        <p className="mt-1 text-sm text-muted">{t("soonText")}</p>
      </section>

      <section className="mt-10 flex flex-wrap gap-3">
        <Button asChild variant="secondary">
          <a href="/api/account/export" download>
            <Download aria-hidden />
            {t("export")}
          </a>
        </Button>
        <form action={signOutAction}>
          <Button type="submit" variant="secondary">
            <LogOut aria-hidden />
            {t("signOut")}
          </Button>
        </form>
      </section>

      <details className="mt-10 rounded-[16px] border border-border p-5">
        <summary className="cursor-pointer font-medium text-down">{t("delete")}</summary>
        <form action={deleteAccount} className="mt-4 space-y-3">
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="confirm" required className="mt-0.5 size-5 accent-[var(--down)]" />
            <span>{t("deleteConfirm")}</span>
          </label>
          <Button type="submit" variant="danger">
            <Trash2 aria-hidden />
            {t("delete")}
          </Button>
        </form>
      </details>
    </div>
  );
}
