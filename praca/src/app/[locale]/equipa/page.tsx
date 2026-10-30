import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { BrandForm, CreateOrgForm, InviteForm, RemoveMemberButton, RevokeInviteButton, RoleSelect } from "@/components/team/team-forms";
import { sql } from "@/db";
import { roleAtLeast, getOrgContext } from "@/server/org";
import { requireUser } from "@/server/session";
import { seatLimit } from "@/server/team";

export const dynamic = "force-dynamic";

export default async function TeamPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ erro?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const u = await requireUser();
  const t = await getTranslations("team");
  const f = await getFormatter();
  const sp = await searchParams;
  const ctx = await getOrgContext();

  if (!ctx) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <h1 className="font-display text-4xl font-medium">{t("createTitle")}</h1>
        <p className="mt-2 max-w-xl text-muted">{t("createText")}</p>
        <CreateOrgForm />
      </div>
    );
  }

  const isAdmin = roleAtLeast(ctx.role, "admin");
  const members = await sql<{ id: string; user_id: string; role: string; name: string | null; email: string }[]>`
    SELECT m.id, m.user_id, m.role::text AS role, u.name, u.email FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.organization_id = ${ctx.orgId} ORDER BY m.created_at`;
  const invites = isAdmin ? await sql<{ id: string; email: string; role: string; expires_at: Date }[]>`SELECT id, email, role::text AS role, expires_at FROM invitations WHERE organization_id = ${ctx.orgId} AND accepted_at IS NULL AND expires_at > now() ORDER BY created_at DESC` : [];
  const limit = await seatLimit(ctx.orgId);
  const logs = isAdmin ? await sql<{ id: string; action: string; created_at: Date; name: string | null; meta: Record<string, unknown> | null }[]>`
    SELECT a.id, a.action, a.created_at, u.name, a.meta FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id WHERE a.organization_id = ${ctx.orgId} ORDER BY a.created_at DESC LIMIT 30` : [];

  return (
    <div className="mx-auto max-w-4xl space-y-12 px-4 py-12 sm:px-6">
      <div>
        <h1 className="font-display text-4xl font-medium">{ctx.orgName}</h1>
        {sp.erro === "permissao" && <p role="alert" className="mt-4 rounded-[12px] bg-down/10 p-3 text-sm text-down">{t("permissionBanner")}</p>}
      </div>

      {isAdmin && (
        <section aria-labelledby="brand">
          <h2 id="brand" className="text-xl font-semibold">{t("brand")}</h2>
          <p className="mb-4 mt-1 text-sm text-muted">{t("brandText")}</p>
          <BrandForm org={{ name: ctx.orgName, logoUrl: ctx.brand.logoUrl, color: ctx.brand.color, email: ctx.brand.email, phone: ctx.brand.phone, website: ctx.brand.website }} />
        </section>
      )}

      <section aria-labelledby="members">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="members" className="text-xl font-semibold">{t("members")}</h2>
          <p className="tnum text-sm text-muted">{t("seatsUsage", { used: members.length + invites.length, limit })}</p>
        </div>
        <div className="mt-4 overflow-x-auto rounded-[16px] border border-border bg-surface">
          <table className="w-full min-w-[480px] text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-muted"><th scope="col" className="p-3 font-medium">{t("colName")}</th><th scope="col" className="p-3 font-medium">{t("colRole")}</th><th scope="col" className="p-3"><span className="sr-only">{t("remove")}</span></th></tr></thead>
            <tbody>
              {members.map((m) => {
                const self = m.user_id === u.id;
                return (
                  <tr key={m.id} className="border-b border-border last:border-0">
                    <th scope="row" className="p-3 text-left font-medium">{m.name ?? m.email} {self && <span className="font-normal text-muted">{t("you")}</span>}<span className="block text-xs font-normal text-muted">{m.email}</span></th>
                    <td className="p-3"><RoleSelect membershipId={m.id} role={m.role} canEdit={isAdmin && !(m.role === "owner" && ctx.role !== "owner")} canOwner={ctx.role === "owner"} /></td>
                    <td className="p-3 text-right">{(isAdmin || self) && <RemoveMemberButton membershipId={m.id} self={self} />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {isAdmin && (
        <section aria-labelledby="inv">
          <h2 id="inv" className="mb-3 text-xl font-semibold">{t("invite")}</h2>
          <InviteForm />
          {invites.length > 0 && (
            <>
              <h3 className="mb-2 mt-6 text-sm font-semibold text-muted">{t("pending")}</h3>
              <ul className="divide-y divide-border rounded-[16px] border border-border bg-surface">
                {invites.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                    <span>{i.email} · {t(`roles.${i.role as "agent"}`)} <span className="text-muted">({t("expires", { date: f.dateTime(i.expires_at, "short") })})</span></span>
                    <RevokeInviteButton id={i.id} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {isAdmin && (
        <section aria-labelledby="aud">
          <h2 id="aud" className="mb-3 text-xl font-semibold">{t("audit")}</h2>
          {logs.length === 0 ? <p className="text-sm text-muted">{t("auditEmpty")}</p> : (
            <ul className="divide-y divide-border rounded-[16px] border border-border bg-surface text-sm">
              {logs.map((l) => <li key={l.id} className="flex flex-wrap justify-between gap-2 p-3"><span><code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">{l.action}</code> <span className="text-muted">{l.name ?? ""}</span></span><time className="tnum text-xs text-muted" dateTime={l.created_at.toISOString()}>{f.dateTime(l.created_at, { dateStyle: "short", timeStyle: "short" })}</time></li>)}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
