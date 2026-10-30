import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { sql } from "@/db";
import { Link } from "@/i18n/navigation";
import { currentUser } from "@/server/session";
import { redirect } from "next/navigation";
import { acceptInvitation } from "@/server/team";

export const dynamic = "force-dynamic";
export const metadata = { title: "Convite", robots: { index: false } };

export default async function InvitePage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("team");
  const u = await currentUser();
  const [inv] = /^[A-Za-z0-9_-]{16,64}$/.test(token)
    ? await sql<{ email: string; org: string }[]>`SELECT i.email, o.name AS org FROM invitations i JOIN organizations o ON o.id = i.organization_id WHERE i.token = ${token} AND i.accepted_at IS NULL AND i.expires_at > now()`
    : [];

  async function accept() {
    "use server";
    const r = await acceptInvitation(token);
    if (r.ok) redirect("/equipa");
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-start px-4 py-20">
      {!inv ? (
        <h1 className="font-display text-3xl font-medium">{t("joinInvalid")}</h1>
      ) : (
        <>
          <h1 className="font-display text-3xl font-medium">{t("joinTitle", { org: inv.org })}</h1>
          {!u ? (
            <>
              <p className="mt-3 text-muted">{t("joinText", { email: inv.email })}</p>
              <Button asChild className="mt-6"><Link href="/entrar">{t("signIn")}</Link></Button>
            </>
          ) : u.email.toLowerCase() !== inv.email.toLowerCase() ? (
            <p role="alert" className="mt-3 text-down">{t("joinWrongEmail")}</p>
          ) : (
            <form action={accept} className="mt-6"><Button type="submit" size="lg">{t("accept")}</Button></form>
          )}
        </>
      )}
    </div>
  );
}
