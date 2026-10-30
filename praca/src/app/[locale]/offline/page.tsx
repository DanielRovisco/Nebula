import { WifiOff } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

export const metadata = { title: "Sem ligação", robots: { index: false } };

export default async function OfflinePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pwa");
  return (
    <div className="mx-auto flex max-w-md flex-col items-start px-4 py-24">
      <div className="mb-5 flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand"><WifiOff className="size-7" aria-hidden /></div>
      <h1 className="font-display text-3xl font-medium">{t("offlineTitle")}</h1>
      <p className="mt-3 text-muted">{t("offlineText")}</p>
    </div>
  );
}
