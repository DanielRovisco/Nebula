"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sql } from "@/db";
import { audit } from "./audit";
import { guardOrg } from "./org-guard";
import { assertSafeWebhookUrl, emitWebhookTo, newSecret, WEBHOOK_EVENTS } from "./webhooks";

export interface WebhookResult {
  ok: boolean;
  error?: "auth" | "plan" | "permission" | "invalid" | "url" | "not_found";
  secret?: string;
}

const uuid = z.string().uuid();
const input = z.object({ url: z.string().url().max(500) });

export async function createWebhook(_p: WebhookResult, form: FormData): Promise<WebhookResult> {
  const g = await guardOrg("crm", "admin");
  if ("error" in g) return { ok: false, error: g.error };
  const p = input.safeParse({ url: form.get("url") });
  const events = form.getAll("events").map(String).filter((e): e is (typeof WEBHOOK_EVENTS)[number] => (WEBHOOK_EVENTS as readonly string[]).includes(e));
  if (!p.success || events.length === 0) return { ok: false, error: "invalid" };
  try {
    await assertSafeWebhookUrl(p.data.url);
  } catch {
    return { ok: false, error: "url" };
  }
  const [{ n } = { n: 0 }] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM webhooks WHERE organization_id = ${g.ctx.orgId}`;
  if (n >= 10) return { ok: false, error: "invalid" };
  const secret = newSecret();
  const [w] = await sql<{ id: string }[]>`INSERT INTO webhooks (organization_id, url, secret, events) VALUES (${g.ctx.orgId}, ${p.data.url}, ${secret}, ${sql.array(events)}) RETURNING id`;
  await audit(g.ctx.user.id, g.ctx.orgId, "webhook.created", "webhook", w!.id, { url: p.data.url });
  revalidatePath("/crm/webhooks");
  return { ok: true, secret }; // shown once
}

export async function toggleWebhook(id: string): Promise<WebhookResult> {
  const g = await guardOrg("crm", "admin");
  if ("error" in g) return { ok: false, error: g.error };
  if (!uuid.safeParse(id).success) return { ok: false, error: "invalid" };
  await sql`UPDATE webhooks SET active = NOT active WHERE id = ${id} AND organization_id = ${g.ctx.orgId}`;
  revalidatePath("/crm/webhooks");
  return { ok: true };
}

export async function deleteWebhook(id: string): Promise<WebhookResult> {
  const g = await guardOrg("crm", "admin");
  if ("error" in g) return { ok: false, error: g.error };
  if (!uuid.safeParse(id).success) return { ok: false, error: "invalid" };
  await sql`DELETE FROM webhooks WHERE id = ${id} AND organization_id = ${g.ctx.orgId}`;
  await audit(g.ctx.user.id, g.ctx.orgId, "webhook.deleted", "webhook", id);
  revalidatePath("/crm/webhooks");
  return { ok: true };
}

export async function testWebhook(id: string): Promise<WebhookResult> {
  const g = await guardOrg("crm", "admin");
  if ("error" in g) return { ok: false, error: g.error };
  if (!uuid.safeParse(id).success) return { ok: false, error: "invalid" };
  const [w] = await sql`SELECT 1 FROM webhooks WHERE id = ${id} AND organization_id = ${g.ctx.orgId}`;
  if (!w) return { ok: false, error: "not_found" };
  await emitWebhookTo(id, "webhook.test", { message: "Praça webhook test" });
  revalidatePath("/crm/webhooks");
  return { ok: true };
}
