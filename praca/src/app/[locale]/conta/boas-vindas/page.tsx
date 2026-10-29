import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { OnboardingForm } from "@/components/auth/onboarding-form";

export const dynamic = "force-dynamic";

export default async function WelcomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) redirect("/entrar");
  const t = await getTranslations("auth");
  return (
    <div className="mx-auto max-w-xl px-4 py-14">
      <h1 className="font-display text-4xl font-medium">{t("onboardingTitle")}</h1>
      <p className="mt-2 text-muted">{t("onboardingSub")}</p>
      <OnboardingForm defaultName={session.user.name ?? ""} />
    </div>
  );
}
