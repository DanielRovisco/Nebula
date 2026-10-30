"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sql } from "@/db";
import { adapterForFormat, ADAPTERS } from "@/ingestion/adapters";
import { encryptSecret } from "@/ingestion/crypto";
import { fetchFeed, type FeedAuth } from "@/ingestion/feeds";
import { refreshPrimary, runIngestion, type RunResult } from "@/ingestion/pipeline";
import { audit } from "./audit";
import { recomputeFraudSignals, type FraudRun } from "./fraud";
import { revokeVerification, verifyListing, VERIFICATION_METHODS, type VerificationMethod } from "./verification";
import { currentUser } from "./session";

export interface AdminResult<T = unknown> {
  ok: boolean;
  error?: "auth" | "invalid" | "not_found" | "failed";
  message?: string;
  data?: T;
}

const uuid = z.string().uuid();

async function admin() {
  const u = await currentUser();
  return u && u.role === "admin" ? u : null;
}

export async function setUserRole(userId: string, role: string): Promise<AdminResult> {
  const a = await admin();
  if (!a) return { ok: false, error: "auth" };
  if (!uuid.safeParse(userId).success || !["user", "editor", "admin"].includes(role)) return { ok: false, error: "invalid" };
  if (userId === a.id && role !== "admin") return { ok: false, error: "invalid", message: "Não pode retirar o seu próprio papel de administrador." };
  await sql`UPDATE users SET role = ${role}::user_role WHERE id = ${userId}`;
  await audit(a.id, null, "admin.user_role", "user", userId, { role });
  revalidatePath("/admin/utilizadores");
  return { ok: true };
}

export async function setAmiStatus(userId: string, status: string): Promise<AdminResult> {
  const a = await admin();
  if (!a) return { ok: false, error: "auth" };
  if (!uuid.safeParse(userId).success || !["none", "pending", "verified", "rejected"].includes(status)) return { ok: false, error: "invalid" };
  await sql`UPDATE users SET ami_status = ${status}::ami_status, verified_advertiser = ${status === "verified"} WHERE id = ${userId}`;
  await audit(a.id, null, "admin.ami_status", "user", userId, { status });
  revalidatePath("/admin/utilizadores");
  return { ok: true };
}

export async function updateEntitlement(plan: string, feature: string, limit: number | null, enabled: boolean): Promise<AdminResult> {
  const a = await admin();
  if (!a) return { ok: false, error: "auth" };
  if (!["free", "pro", "agency"].includes(plan) || !/^[a-z_]{2,30}$/.test(feature) || (limit != null && (!Number.isInteger(limit) || limit < 0))) return { ok: false, error: "invalid" };
  await sql`UPDATE entitlements SET limit_value = ${limit}, enabled = ${enabled} WHERE plan = ${plan}::plan AND feature = ${feature}`;
  await audit(a.id, null, "admin.entitlement", "entitlement", `${plan}:${feature}`, { limit, enabled });
  revalidatePath("/admin/planos");
  return { ok: true };
}

export async function setListingStatus(listingId: string, status: string): Promise<AdminResult> {
  const a = await admin();
  if (!a) return { ok: false, error: "auth" };
  if (!uuid.safeParse(listingId).success || !["active", "withdrawn", "pending_review", "expired"].includes(status)) return { ok: false, error: "invalid" };
  const [l] = await sql<{ property_id: string; status: string }[]>`UPDATE listings SET status = ${status}::listing_status, ended_at = ${status === "active" ? null : sql`coalesce(ended_at, now())`}, last_seen_at = now(), updated_at = now() WHERE id = ${listingId} RETURNING property_id, (SELECT status::text FROM listings WHERE id = ${listingId}) AS status`;
  if (!l) return { ok: false, error: "not_found" };
  if (status === "active") {
    // Approved by moderation → it enters the market: publish event for the alert engine.
    await sql`INSERT INTO listing_events (listing_id, property_id, type) VALUES (${listingId}, ${l.property_id}, 'published')`;
  }
  await refreshPrimary(l.property_id);
  await audit(a.id, null, "admin.listing_status", "listing", listingId, { status });
  revalidatePath("/admin/imoveis");
  revalidatePath("/admin/moderacao");
  return { ok: true };
}

export async function setPropertyHidden(propertyId: string, hidden: boolean): Promise<AdminResult> {
  const a = await admin();
  if (!a) return { ok: false, error: "auth" };
  if (!uuid.safeParse(propertyId).success) return { ok: false, error: "invalid" };
  await sql`UPDATE properties SET deleted_at = ${hidden ? sql`now()` : null} WHERE id = ${propertyId}`;
  await audit(a.id, null, hidden ? "admin.property_hidden" : "admin.property_restored", "property", propertyId);
  revalidatePath("/admin/imoveis");
  return { ok: true };
}

/** Manual dedupe review: merge moves the advert onto the candidate property; reject keeps them distinct. */
export async function resolveDedupe(candidateId: string, action: "merge" | "reject"): Promise<AdminResult> {
  const a = await admin();
  if (!a) return { ok: false, error: "auth" };
  if (!uuid.safeParse(candidateId).success) return { ok: false, error: "invalid" };
  const [c] = await sql<{ listing_id: string; candidate_property_id: string; old_property: string }[]>`
    SELECT d.listing_id, d.candidate_property_id, l.property_id AS old_property FROM dedupe_candidates d JOIN listings l ON l.id = d.listing_id WHERE d.id = ${candidateId} AND d.status = 'pending'`;
  if (!c) return { ok: false, error: "not_found" };
  if (action === "merge" && c.old_property !== c.candidate_property_id) {
    await sql.begin(async (tx) => {
      await tx`UPDATE listings SET property_id = ${c.candidate_property_id}, is_primary = false, updated_at = now() WHERE id = ${c.listing_id}`;
      await tx`INSERT INTO listing_events (listing_id, property_id, type) VALUES (${c.listing_id}, ${c.candidate_property_id}, 'merged')`;
      // Move user data pointing at the absorbed property; drop duplicates of the unique (user, property) pairs.
      await tx`DELETE FROM favorites f WHERE f.property_id = ${c.old_property} AND EXISTS (SELECT 1 FROM favorites x WHERE x.user_id = f.user_id AND x.property_id = ${c.candidate_property_id})`;
      await tx`UPDATE favorites SET property_id = ${c.candidate_property_id} WHERE property_id = ${c.old_property}`;
      const [left] = await tx<{ n: number }[]>`SELECT count(*)::int AS n FROM listings WHERE property_id = ${c.old_property} AND deleted_at IS NULL`;
      if (!left || left.n === 0) await tx`UPDATE properties SET deleted_at = now() WHERE id = ${c.old_property}`;
      await tx`UPDATE dedupe_candidates SET status = 'merged', reviewed_by = ${a.id}, updated_at = now() WHERE id = ${candidateId}`;
    });
    await refreshPrimary(c.candidate_property_id);
    await refreshPrimary(c.old_property);
  } else {
    await sql`UPDATE dedupe_candidates SET status = 'rejected', reviewed_by = ${a.id}, updated_at = now() WHERE id = ${candidateId}`;
  }
  await audit(a.id, null, `admin.dedupe_${action}`, "dedupe", candidateId);
  revalidatePath("/admin/duplicados");
  return { ok: true };
}

const sourceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  kind: z.enum(["csv", "xml_feed", "json_api", "manual", "partner", "open_data"]),
  format: z.enum(["csv", "json", "kyero"]),
  licence: z.string().trim().min(5).max(500),
  endpoint: z.union([z.literal(""), z.string().url().max(500)]).optional(),
  authKind: z.enum(["none", "basic", "bearer"]).default("none"),
  secret: z.string().max(500).optional(),
  frequencyMinutes: z.coerce.number().int().min(15).max(10080).optional(),
});

export async function createSource(_p: AdminResult, form: FormData): Promise<AdminResult<{ id: string }>> {
  const a = await admin();
  if (!a) return { ok: false, error: "auth" };
  const raw = Object.fromEntries(form);
  const p = sourceSchema.safeParse({ ...raw, frequencyMinutes: raw.frequencyMinutes === "" ? undefined : raw.frequencyMinutes });
  if (!p.success) return { ok: false, error: "invalid", message: "Indique nome, formato e a licença/base legal da fonte." };
  const d = p.data;
  const slug = `${d.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Math.random().toString(36).slice(2, 6)}`;
  const config: Record<string, unknown> = { authKind: d.authKind, ...(d.secret ? { secret: encryptSecret(d.secret) } : {}) };
  const [s] = await sql<{ id: string }[]>`
    INSERT INTO sources (slug, name, kind, licence, endpoint, format, config, frequency_minutes, organization_id)
    VALUES (${slug}, ${d.name}, ${d.kind}::source_kind, ${d.licence}, ${d.endpoint || null}, ${d.format}, ${sql.json(config as never)}, ${d.frequencyMinutes ?? null}, NULL) RETURNING id`;
  await audit(a.id, null, "admin.source_created", "source", s!.id, { name: d.name });
  revalidatePath("/admin/fontes");
  return { ok: true, data: { id: s!.id } };
}

export async function toggleSource(id: string): Promise<AdminResult> {
  const a = await admin();
  if (!a || !uuid.safeParse(id).success) return { ok: false, error: a ? "invalid" : "auth" };
  await sql`UPDATE sources SET enabled = NOT enabled WHERE id = ${id}`;
  await audit(a.id, null, "admin.source_toggled", "source", id);
  revalidatePath("/admin/fontes");
  return { ok: true };
}

export type IngestionSummary = Pick<RunResult, "runId" | "status" | "stats"> & { firstErrors: string[] };
const summarise = (r: RunResult): IngestionSummary => ({ runId: r.runId, status: r.status, stats: r.stats, firstErrors: r.errors.slice(0, 5).map((e) => `${e.externalId ?? "—"}: ${e.message}`) });

/** Upload + ingest in one step (CSV/JSON/XML), with the column mapping chosen in the UI. */
export async function uploadAndIngest(_p: AdminResult<IngestionSummary>, form: FormData): Promise<AdminResult<IngestionSummary>> {
  const a = await admin();
  if (!a) return { ok: false, error: "auth" };
  const sourceId = String(form.get("sourceId") ?? "");
  const file = form.get("file");
  if (!uuid.safeParse(sourceId).success || !(file instanceof File) || file.size === 0 || file.size > 20_000_000) return { ok: false, error: "invalid", message: "Escolha uma fonte e um ficheiro (até 20 MB)." };
  const [src] = await sql<{ format: string | null }[]>`SELECT format FROM sources WHERE id = ${sourceId}`;
  const adapter = adapterForFormat(src?.format, file.name);
  if (!adapter) return { ok: false, error: "invalid", message: "Formato não suportado (use CSV, JSON ou XML Kyero)." };
  let mapping: Record<string, string> | undefined;
  try {
    const m = form.get("mapping");
    mapping = m ? (JSON.parse(String(m)) as Record<string, string>) : undefined;
  } catch {
    return { ok: false, error: "invalid", message: "Mapeamento de colunas inválido." };
  }
  const business = form.get("defaultBusiness");
  try {
    const r = await runIngestion({ sourceId, adapter, content: await file.text(), mode: form.get("mode") === "full" ? "full" : "incremental", mapping, defaultBusiness: business === "rent" ? "rent" : business === "sale" ? "sale" : undefined, triggeredBy: a.id });
    await audit(a.id, null, "admin.ingest_upload", "source", sourceId, { stats: r.stats });
    revalidatePath("/admin/execucoes");
    return { ok: true, data: summarise(r) };
  } catch (e) {
    return { ok: false, error: "failed", message: e instanceof Error ? e.message : "Falhou." };
  }
}

/** Pulls a configured feed now (same code path the cron uses). */
export async function runSourceNow(id: string): Promise<AdminResult<IngestionSummary>> {
  const a = await admin();
  if (!a || !uuid.safeParse(id).success) return { ok: false, error: a ? "invalid" : "auth" };
  try {
    const r = await runFeedSource(id, a.id);
    await audit(a.id, null, "admin.ingest_run", "source", id, { stats: r.stats });
    revalidatePath("/admin/execucoes");
    revalidatePath("/admin/fontes");
    return { ok: true, data: summarise(r) };
  } catch (e) {
    return { ok: false, error: "failed", message: e instanceof Error ? e.message : "Falhou." };
  }
}

export async function runFeedSource(id: string, triggeredBy: string | null): Promise<RunResult> {
  const [s] = await sql<{ endpoint: string | null; format: string | null; config: { authKind?: FeedAuth["kind"]; secret?: string } }[]>`SELECT endpoint, format, config FROM sources WHERE id = ${id}`;
  if (!s?.endpoint) throw new Error("A fonte não tem URL de feed configurado.");
  const adapter = adapterForFormat(s.format) ?? ADAPTERS.csv!;
  const content = await fetchFeed(s.endpoint, { kind: s.config.authKind ?? "none", secret: s.config.secret });
  return runIngestion({ sourceId: id, adapter, content, mode: "full", triggeredBy });
}

export async function verifyByReference(reference: string, method: string, evidence: string): Promise<AdminResult> {
  const a = await admin();
  if (!a) return { ok: false, error: "auth" };
  if (!/^PR-\d{6}$/i.test(reference.trim()) || !(VERIFICATION_METHODS as readonly string[]).includes(method) || evidence.trim().length < 3 || evidence.length > 200) return { ok: false, error: "invalid" };
  const [l] = await sql<{ id: string }[]>`SELECT l.id FROM listings l JOIN properties p ON p.id = l.property_id WHERE p.reference = ${reference.trim().toUpperCase()} AND l.is_primary AND l.deleted_at IS NULL LIMIT 1`;
  if (!l) return { ok: false, error: "not_found" };
  await verifyListing(l.id, method as VerificationMethod, evidence.trim(), a.id);
  await audit(a.id, null, "admin.verify_listing", "listing", l.id, { method });
  revalidatePath("/admin/moderacao");
  return { ok: true };
}

export async function revokeListingVerification(verificationId: string): Promise<AdminResult> {
  const a = await admin();
  if (!a) return { ok: false, error: "auth" };
  if (!uuid.safeParse(verificationId).success) return { ok: false, error: "invalid" };
  await revokeVerification(verificationId);
  await audit(a.id, null, "admin.revoke_verification", "listing_verification", verificationId, {});
  revalidatePath("/admin/moderacao");
  return { ok: true };
}

export async function runFraudScan(): Promise<AdminResult<FraudRun>> {
  const a = await admin();
  if (!a) return { ok: false, error: "auth" };
  const data = await recomputeFraudSignals();
  await audit(a.id, null, "admin.fraud_scan", "system", "fraud", { ...data });
  revalidatePath("/admin/moderacao");
  return { ok: true, data };
}
