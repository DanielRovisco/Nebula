import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { sql } from "@/db";

/** Append-only audit trail (who did what, in which organisation). Never throws: auditing must not break the action. */
export async function audit(actorId: string | null, organizationId: string | null, action: string, entity?: string, entityId?: string, meta?: Record<string, unknown>) {
  try {
    let ipHash: string | null = null;
    try {
      const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();
      if (ip) ipHash = createHash("sha256").update(ip + (process.env.AUTH_SECRET ?? "")).digest("hex").slice(0, 32);
    } catch {
      /* outside a request (cron/scripts) */
    }
    await sql`INSERT INTO audit_log (actor_id, organization_id, action, entity, entity_id, meta, ip_hash)
              VALUES (${actorId}, ${organizationId}, ${action}, ${entity ?? null}, ${entityId ?? null}, ${meta ? sql.json(meta as never) : null}, ${ipHash})`;
  } catch (e) {
    console.error("[audit]", e);
  }
}
