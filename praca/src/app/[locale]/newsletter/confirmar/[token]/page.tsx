import { MailCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { confirmByToken } from "@/server/newsletter";

export const dynamic = "force-dynamic";
export const metadata = { title: "Newsletter", robots: { index: false } };

export default async function ConfirmPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("newsletter");
  const ok = await confirmByToken(token);
  return (
    <div className="mx-auto flex max-w-md flex-col items-start px-4 py-20">
      <div className="mb-5 flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand"><MailCheck className="size-7" aria-hidden /></div>
      <h1 className="font-display text-3xl font-medium">{ok ? t("confirmedTitle") : t("invalidTitle")}</h1>
      <p className="mt-3 text-muted">{ok ? t("confirmedText") : t("invalidText")}</p>
      <Button asChild variant="secondary" className="mt-6"><Link href="/blog">{t("toBlog")}</Link></Button>
    </div>
  );
}
