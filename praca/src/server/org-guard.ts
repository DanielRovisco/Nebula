import { effectivePlan, getEntitlement, type Feature } from "./entitlements";
import { getOrgContext, roleAtLeast, type OrgContext } from "./org";

export type GuardError = "auth" | "plan" | "permission";

/** Organisation + feature entitlement + minimum role. Server actions call this first; ids from the client are never trusted. */
export async function guardOrg(feature: Feature, min: "viewer" | "agent" | "admin" = "agent"): Promise<{ ctx: OrgContext } | { error: GuardError }> {
  const ctx = await getOrgContext();
  if (!ctx) return { error: "auth" };
  const plan = await effectivePlan(ctx.user.id);
  if (!(await getEntitlement(plan.plan, feature)).enabled) return { error: "plan" };
  if (!roleAtLeast(ctx.role, min)) return { error: "permission" };
  return { ctx };
}
