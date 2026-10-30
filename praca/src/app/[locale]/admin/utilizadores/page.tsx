import { getTranslations, setRequestLocale } from "next-intl/server";
import { AmiSelect, UserRoleSelect } from "@/components/admin/admin-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sql } from "@/db";

export const dynamic = "force-dynamic";

export default async function AdminUsers({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const ta = await getTranslations("auth");
  const { q } = await searchParams;
  const like = q?.trim() ? `%${q.trim().replace(/[%_\\]/g, "\\$&")}%` : null;
  const rows = await sql<{ id: string; email: string; name: string | null; role: string; profile_type: string; ami_number: string | null; ami_status: string; plan: string | null }[]>`
    SELECT u.id, u.email, u.name, u.role::text AS role, u.profile_type::text AS profile_type, u.ami_number, u.ami_status::text AS ami_status,
           (SELECT plan::text FROM subscriptions s WHERE s.user_id = u.id AND s.status IN ('trialing','active','past_due') ORDER BY created_at DESC LIMIT 1) AS plan
    FROM users u WHERE u.deleted_at IS NULL ${like ? sql`AND (u.email ILIKE ${like} OR u.name ILIKE ${like})` : sql``} ORDER BY u.created_at DESC LIMIT 100`;
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-medium">{t("tabs.users")}</h1>
      <form role="search" className="flex gap-3"><Input name="q" defaultValue={q ?? ""} placeholder={t("search")} aria-label={t("search")} className="max-w-sm" /><Button type="submit" variant="secondary">OK</Button></form>
      <div className="overflow-x-auto rounded-[16px] border border-border bg-surface">
        <table className="w-full min-w-[820px] text-sm">
          <thead><tr className="border-b border-border text-left text-xs text-muted"><th scope="col" className="p-3 font-medium">{t("colUser")}</th><th scope="col" className="p-3 font-medium">{t("colProfile")}</th><th scope="col" className="p-3 font-medium">{t("colRole")}</th><th scope="col" className="p-3 font-medium">{t("colAmi")}</th></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <th scope="row" className="p-3 text-left font-medium">{u.name ?? "—"}<span className="block text-xs font-normal text-muted">{u.email}{u.plan ? ` · ${u.plan}` : ""}</span></th>
                <td className="p-3 text-muted">{ta(`profile.${u.profile_type as "private"}`)}</td>
                <td className="p-3"><UserRoleSelect id={u.id} role={u.role} /></td>
                <td className="p-3"><div className="flex items-center gap-2">{u.ami_number && <code className="text-xs">{u.ami_number}</code>}<AmiSelect id={u.id} status={u.ami_status} /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
