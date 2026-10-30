import { cache } from "react";
import { redirect } from "next/navigation";
import { sql } from "@/db";
import { currentUser, requireUser, type CurrentUser } from "./session";

export type OrgRole = "owner" | "admin" | "agent" | "viewer";
const RANK: Record<OrgRole, number> = { viewer: 0, agent: 1, admin: 2, owner: 3 };

export interface OrgContext {
  user: CurrentUser;
  orgId: string;
  orgName: string;
  orgSlug: string;
  plan: "free" | "pro" | "agency";
  role: OrgRole;
  brand: { logoUrl: string | null; color: string | null; email: string | null; phone: string | null; website: string | null };
}

/** Role check: viewers read, agents write their own data, admins manage the team, owners manage billing. */
export const roleAtLeast = (role: OrgRole, min: OrgRole) => RANK[role] >= RANK[min];

/** The user's active organisation (first membership by creation date). Tenant id for every CRM query. */
export const getOrgContext = cache(async (): Promise<OrgContext | null> => {
  const user = await currentUser();
  if (!user) return null;
  const [r] = await sql<{ id: string; name: string; slug: string; plan: OrgContext["plan"]; role: OrgRole; logo_url: string | null; brand_color: string | null; email: string | null; phone: string | null; website: string | null }[]>`
    SELECT o.id, o.name, o.slug, o.plan, m.role, o.logo_url, o.brand_color, o.email, o.phone, o.website
    FROM memberships m JOIN organizations o ON o.id = m.organization_id
    WHERE m.user_id = ${user.id} AND o.deleted_at IS NULL ORDER BY m.created_at LIMIT 1`;
  if (!r) return null;
  return { user, orgId: r.id, orgName: r.name, orgSlug: r.slug, plan: r.plan, role: r.role, brand: { logoUrl: r.logo_url, color: r.brand_color, email: r.email, phone: r.phone, website: r.website } };
});

/** For pages: requires a membership with at least `min`; otherwise sends the user to create/join a team. */
export async function requireOrg(min: OrgRole = "viewer"): Promise<OrgContext> {
  await requireUser();
  const ctx = await getOrgContext();
  if (!ctx) redirect("/equipa");
  if (!roleAtLeast(ctx.role, min)) redirect("/equipa?erro=permissao");
  return ctx;
}
