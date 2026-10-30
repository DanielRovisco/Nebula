import { BellOff } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { sql } from "@/db";
import { Link } from "@/i18n/navigation";
import { unsubscribeByToken } from "@/server/saved-searches";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cancelar alerta", robots: { index: false } };

export default async function UnsubscribePage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("alerts");
  const [a] = /^[A-Za-z0-9_-]{16,64}$/.test(token)
    ? await sql<{ name: string; active: boolean }[]>`SELECT s.name, a.active FROM alerts a JOIN saved_searches s ON s.id = a.saved_search_id WHERE a.unsubscribe_token = ${token}`
    : [];

  async function confirm() {
    "use server";
    await unsubscribeByToken(token);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-start px-4 py-20">
      <div className="mb-5 flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand">
        <BellOff className="size-7" aria-hidden />
      </div>
      {!a ? (
        <>
          <h1 className="font-display text-3xl font-medium">{t("unsubInvalidTitle")}</h1>
          <p className="mt-3 text-muted">{t("unsubInvalidText")}</p>
        </>
      ) : !a.active ? (
        <>
          <h1 className="font-display text-3xl font-medium">{t("unsubDoneTitle")}</h1>
          <p className="mt-3 text-muted">{t("unsubDoneText", { name: a.name })}</p>
          <Button asChild variant="secondary" className="mt-6"><Link href="/conta/pesquisas">{t("manage")}</Link></Button>
        </>
      ) : (
        <>
          <h1 className="font-display text-3xl font-medium">{t("unsubTitle")}</h1>
          <p className="mt-3 text-muted">{t("unsubText", { name: a.name })}</p>
          {/* A button, not a GET side effect: mail scanners prefetch links. */}
          <form action={confirm} className="mt-6">
            <Button type="submit" size="lg">{t("unsubConfirm")}</Button>
          </form>
        </>
      )}
    </div>
  );
}
