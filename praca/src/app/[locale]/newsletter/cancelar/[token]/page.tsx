import { MailX } from "lucide-react";
import { revalidatePath } from "next/cache";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { subscriberState, unsubscribeByToken } from "@/server/newsletter";

export const dynamic = "force-dynamic";
export const metadata = { title: "Newsletter", robots: { index: false } };

export default async function UnsubscribePage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("newsletter");
  const state = await subscriberState(token);

  async function confirm() {
    "use server";
    await unsubscribeByToken(token);
    revalidatePath(`/newsletter/cancelar/${token}`);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-start px-4 py-20">
      <div className="mb-5 flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand"><MailX className="size-7" aria-hidden /></div>
      {state === null ? (
        <>
          <h1 className="font-display text-3xl font-medium">{t("invalidTitle")}</h1>
          <p className="mt-3 text-muted">{t("invalidText")}</p>
        </>
      ) : state === "unsubscribed" ? (
        <>
          <h1 className="font-display text-3xl font-medium">{t("unsubDoneTitle")}</h1>
          <p className="mt-3 text-muted">{t("unsubDoneText")}</p>
        </>
      ) : (
        <>
          <h1 className="font-display text-3xl font-medium">{t("unsubTitle")}</h1>
          <p className="mt-3 text-muted">{t("unsubText")}</p>
          <form action={confirm}><Button type="submit" className="mt-6">{t("unsubConfirm")}</Button></form>
        </>
      )}
      <Button asChild variant="secondary" className="mt-4"><Link href="/blog">{t("toBlog")}</Link></Button>
    </div>
  );
}
