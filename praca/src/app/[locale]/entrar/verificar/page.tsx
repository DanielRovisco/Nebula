import { MailCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { isProduction } from "@/lib/env";

export default async function VerifyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  const c = await getTranslations("common");
  return (
    <div className="mx-auto flex max-w-md flex-col items-start px-4 py-20">
      <div className="mb-5 flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand">
        <MailCheck className="size-7" aria-hidden />
      </div>
      <h1 className="font-display text-4xl font-medium">{t("checkEmailTitle")}</h1>
      <p className="mt-3 text-muted">{t("checkEmailText")}</p>
      {!isProduction && <p className="mt-4 rounded-[12px] bg-warn-soft px-4 py-3 text-sm text-warn">{t("devLinkNote")}</p>}
      <Button asChild variant="secondary" className="mt-8">
        <Link href="/entrar">{c("back")}</Link>
      </Button>
    </div>
  );
}
