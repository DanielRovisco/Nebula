import { effectivePlan, getEntitlement, type Feature } from "./entitlements";
import { requireOrg, roleAtLeast, type OrgContext } from "./org";

/** Organisation + feature entitlement for CRM pages. `allowed` false → render the upgrade notice (state: no permissions). */
export async function crmContext(feature: Feature = "crm"): Promise<{ ctx: OrgContext; allowed: boolean; canWrite: boolean }> {
  const ctx = await requireOrg("viewer");
  const plan = await effectivePlan(ctx.user.id);
  const ent = await getEntitlement(plan.plan, feature);
  return { ctx, allowed: ent.enabled, canWrite: roleAtLeast(ctx.role, "agent") };
}
