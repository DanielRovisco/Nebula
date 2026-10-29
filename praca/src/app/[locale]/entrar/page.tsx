import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth, googleEnabled } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/logo";

export const dynamic = "force-dynamic";

export default async function SignInPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ error?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth().catch(() => null);
  if (session?.user) redirect("/conta");
  const t = await getTranslations("auth");
  const { error } = await searchParams;
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-14 sm:py-20">
      <Logo className="mb-8" />
      <h1 className="font-display text-4xl font-medium">{t("signInTitle")}</h1>
      <p className="mt-2 text-muted">{t("signInSub")}</p>
      {error && (
        <p role="alert" className="mt-5 rounded-[12px] bg-down/10 px-4 py-3 text-sm text-down">
          {error === "Verification" ? t("errorVerification") : t("errorGeneric")}
        </p>
      )}
      <LoginForm googleEnabled={googleEnabled} />
    </div>
  );
}
