"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { FIELD_ALIASES } from "@/ingestion/normalize";
import { createSource, resolveDedupe, revokeListingVerification, runFraudScan, runSourceNow, verifyByReference, setAmiStatus, setListingStatus, setPropertyHidden, setUserRole, toggleSource, updateEntitlement, uploadAndIngest, type AdminResult, type IngestionSummary } from "@/server/admin";

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return { pending, run: (fn: () => Promise<unknown>) => start(async () => { await fn(); router.refresh(); }) };
}

export function UserRoleSelect({ id, role }: { id: string; role: string }) {
  const t = useTranslations("admin");
  const { pending, run } = useRun();
  return <Select aria-label={t("colRole")} className="h-9 w-auto text-sm" defaultValue={role} disabled={pending} onChange={(e) => run(() => setUserRole(id, e.target.value))}>{(["user", "editor", "admin"] as const).map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}</Select>;
}

export function AmiSelect({ id, status }: { id: string; status: string }) {
  const t = useTranslations("admin");
  const { pending, run } = useRun();
  return <Select aria-label={t("colAmi")} className="h-9 w-auto text-sm" defaultValue={status} disabled={pending} onChange={(e) => run(() => setAmiStatus(id, e.target.value))}>{(["none", "pending", "verified", "rejected"] as const).map((r) => <option key={r} value={r}>{t(`ami.${r}`)}</option>)}</Select>;
}

export function ListingStatusSelect({ id, status }: { id: string; status: string }) {
  const t = useTranslations("admin");
  const { pending, run } = useRun();
  const options = ["active", "withdrawn", "pending_review", "expired"];
  if (!options.includes(status)) return <span>{t(`status.${status as "sold"}`)}</span>;
  return <Select aria-label={t("colStatus")} className="h-9 w-auto text-sm" defaultValue={status} disabled={pending} onChange={(e) => run(() => setListingStatus(id, e.target.value))}>{options.map((s) => <option key={s} value={s}>{t(`status.${s as "active"}`)}</option>)}</Select>;
}

export function HideButton({ id, hidden }: { id: string; hidden: boolean }) {
  const t = useTranslations("admin");
  const { pending, run } = useRun();
  return <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setPropertyHidden(id, !hidden))}>{hidden ? t("restore") : t("hide")}</Button>;
}

export function ModerationButtons({ id }: { id: string }) {
  const t = useTranslations("admin");
  const { pending, run } = useRun();
  return (
    <div className="flex gap-2">
      <Button size="sm" disabled={pending} onClick={() => run(() => setListingStatus(id, "active"))}>{t("approve")}</Button>
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => setListingStatus(id, "withdrawn"))}>{t("reject")}</Button>
    </div>
  );
}

export function DedupeButtons({ id }: { id: string }) {
  const t = useTranslations("admin");
  const { pending, run } = useRun();
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" disabled={pending} onClick={() => run(() => resolveDedupe(id, "merge"))}>{t("merge")}</Button>
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => resolveDedupe(id, "reject"))}>{t("distinct")}</Button>
    </div>
  );
}

export function EntitlementRow({ plan, feature, limit, enabled }: { plan: string; feature: string; limit: number | null; enabled: boolean }) {
  const t = useTranslations("admin");
  const { pending, run } = useRun();
  const [lim, setLim] = useState(limit == null ? "" : String(limit));
  const [on, setOn] = useState(enabled);
  return (
    <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); run(() => updateEntitlement(plan, feature, lim === "" ? null : Number(lim), on)); }}>
      <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} className="size-4 accent-[var(--brand)]" aria-label={`${plan} ${feature} ${t("enabled")}`} /></label>
      <Input type="number" min={0} value={lim} onChange={(e) => setLim(e.target.value)} className="h-9 w-24 text-sm" aria-label={`${plan} ${feature} ${t("limit")}`} placeholder="∞" />
      <Button type="submit" size="sm" variant="ghost" disabled={pending}>{t("save")}</Button>
    </form>
  );
}

export function SourceForm() {
  const t = useTranslations("admin");
  const router = useRouter();
  const [state, action, pending] = useActionState<AdminResult, FormData>(async (p, f) => { const r = await createSource(p, f); if (r.ok) router.refresh(); return r; }, { ok: false });
  const [auth, setAuth] = useState("none");
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div><Label htmlFor="s-name">{t("srcName")}</Label><Input id="s-name" name="name" required minLength={2} /></div>
      <div><Label htmlFor="s-format">{t("srcFormat")}</Label><Select id="s-format" name="format"><option value="csv">CSV</option><option value="json">JSON</option><option value="kyero">XML Kyero</option></Select></div>
      <div><Label htmlFor="s-kind">{t("srcKind")}</Label><Select id="s-kind" name="kind"><option value="csv">CSV</option><option value="xml_feed">XML feed</option><option value="json_api">JSON API</option><option value="manual">Manual</option><option value="partner">Parceiro</option></Select></div>
      <div className="sm:col-span-2 lg:col-span-3"><Label htmlFor="s-lic">{t("srcLicence")}</Label><Input id="s-lic" name="licence" required minLength={5} placeholder="Ex.: Acordo de partilha de anúncios com a Agência X, de 01/03/2026" /></div>
      <div className="sm:col-span-2"><Label htmlFor="s-url">{t("srcEndpoint")}</Label><Input id="s-url" name="endpoint" type="url" placeholder="https://" /></div>
      <div><Label htmlFor="s-freq">{t("srcFreq")}</Label><Input id="s-freq" name="frequencyMinutes" type="number" min={15} max={10080} placeholder="60" /></div>
      <div><Label htmlFor="s-auth">{t("srcAuth")}</Label><Select id="s-auth" name="authKind" value={auth} onChange={(e) => setAuth(e.target.value)}><option value="none">{t("srcAuthNone")}</option><option value="basic">{t("srcAuthBasic")}</option><option value="bearer">{t("srcAuthBearer")}</option></Select></div>
      {auth !== "none" && <div className="sm:col-span-2"><Label htmlFor="s-secret">{t("srcSecret")}</Label><Input id="s-secret" name="secret" type="password" autoComplete="off" /></div>}
      <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3"><Button type="submit" disabled={pending}>{pending && <Loader2 className="animate-spin" aria-hidden />}{t("srcCreate")}</Button>{state.message && <p role="alert" className="text-sm text-down">{state.message}</p>}</div>
    </form>
  );
}

export function SourceActions({ id, enabled, hasEndpoint }: { id: string; enabled: boolean; hasEndpoint: boolean }) {
  const t = useTranslations("admin");
  const { pending, run } = useRun();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {hasEndpoint && <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(async () => { const r = await runSourceNow(id); setMsg(r.ok && r.data ? `${r.data.status}: ${r.data.stats.created}/${r.data.stats.updated}` : r.message ?? t("failed")); })}>{t("srcRun")}</Button>}
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => toggleSource(id))}>{enabled ? t("srcToggleOff") : t("srcToggleOn")}</Button>
      {msg && <span role="status" className="text-xs text-muted">{msg}</span>}
    </div>
  );
}

const MAPPABLE = ["externalId", "business", "type", "typology", "price", "usableArea", "bedrooms", "bathrooms", "yearBuilt", "floor", "condition", "energyClass", "address", "postalCode", "parishName", "municipalityName", "lat", "lng", "title", "description", "advertiserType", "advertiserName", "imageUrls", "publishedAt"] as const;
const norm = (k: string) => k.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9_+]/g, "_");

export function UploadForm({ sources }: { sources: { id: string; name: string; format: string | null }[] }) {
  const t = useTranslations("admin");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isCsv, setIsCsv] = useState(false);
  const [state, action, pending] = useActionState<AdminResult<IngestionSummary>, FormData>(uploadAndIngest, { ok: false });

  // Fields the file already covers (by name/alias) need no manual mapping.
  const recognised = (field: string) => headers.some((h) => [field.toLowerCase(), ...(FIELD_ALIASES[field] ?? [])].includes(norm(h)));

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="mapping" value={JSON.stringify(Object.fromEntries(Object.entries(mapping).filter(([, v]) => v)))} />
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2"><Label htmlFor="u-src">{t("tabs.sources")}</Label><Select id="u-src" name="sourceId" required>{sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></div>
        <div><Label htmlFor="u-mode">{t("srcMode")}</Label><Select id="u-mode" name="mode"><option value="incremental">{t("srcModeInc")}</option><option value="full">{t("srcModeFull")}</option></Select></div>
        <div><Label htmlFor="u-biz">{t("srcDefaultBiz")}</Label><Select id="u-biz" name="defaultBusiness"><option value="">—</option><option value="sale">Venda</option><option value="rent">Arrendamento</option></Select></div>
        <div className="sm:col-span-4">
          <Label htmlFor="u-file">{t("srcFile")}</Label>
          <Input id="u-file" name="file" type="file" accept=".csv,.tsv,.txt,.json,.xml" required className="h-auto py-2"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              setMapping({});
              const csv = !!f && /\.(csv|tsv|txt)$/i.test(f.name);
              setIsCsv(csv);
              if (!f || !csv) return setHeaders([]);
              const text = await f.slice(0, 20000).text();
              const p = Papa.parse<string[]>(text.replace(/^﻿/, ""), { preview: 1 });
              setHeaders((p.data[0] ?? []).map((h) => String(h).trim()).filter(Boolean));
            }} />
        </div>
      </div>
      {isCsv && headers.length > 0 && (
        <fieldset className="rounded-[14px] border border-border p-4">
          <legend className="px-1 text-sm font-semibold">{t("srcMapping")}</legend>
          <p className="mb-3 text-xs text-muted">{t("srcMappingHint")}</p>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {MAPPABLE.map((f) => (
              <div key={f}>
                <Label htmlFor={`m-${f}`} className="text-xs">{f}{recognised(f) ? " ✓" : ""}</Label>
                <Select id={`m-${f}`} className="h-9 text-sm" value={mapping[f] ?? ""} onChange={(e) => setMapping((m) => ({ ...m, [f]: e.target.value }))}>
                  <option value="">{t("srcAuto")}</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </Select>
              </div>
            ))}
          </div>
        </fieldset>
      )}
      <Button type="submit" disabled={pending}>{pending && <Loader2 className="animate-spin" aria-hidden />}{t("srcRunBtn")}</Button>
      {state.ok && state.data && (
        <div role="status" className="rounded-[12px] bg-up/10 p-3 text-sm text-up">
          {t("srcResult", { ...state.data.stats })}
          {state.data.firstErrors.length > 0 && <ul className="mt-2 list-disc pl-5 text-xs text-muted">{state.data.firstErrors.map((e) => <li key={e}>{e}</li>)}</ul>}
        </div>
      )}
      {!state.ok && state.message && <p role="alert" className="text-sm text-down">{state.message}</p>}
    </form>
  );
}

export function VerifyForm() {
  const t = useTranslations("admin");
  const router = useRouter();
  const [ref, setRef] = useState("");
  const [method, setMethod] = useState("licence_ami");
  const [evidence, setEvidence] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const r = await verifyByReference(ref, method, evidence);
          setMsg(r.ok ? t("verifyDone") : t(`verifyErr.${r.error === "not_found" ? "not_found" : "invalid"}`));
          if (r.ok) {
            setRef("");
            setEvidence("");
            router.refresh();
          }
        });
      }}
    >
      <div><Label htmlFor="v-ref">{t("verifyRef")}</Label><Input id="v-ref" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="PR-000123" required /></div>
      <div><Label htmlFor="v-method">{t("verifyMethod")}</Label><Select id="v-method" value={method} onChange={(e) => setMethod(e.target.value)}>{(["licence_ami", "owner_document", "site_visit"] as const).map((m) => <option key={m} value={m}>{t(`verifyMethods.${m}`)}</option>)}</Select></div>
      <div><Label htmlFor="v-ev">{t("verifyEvidence")}</Label><Input id="v-ev" value={evidence} onChange={(e) => setEvidence(e.target.value)} maxLength={200} required /></div>
      <Button type="submit" disabled={pending}>{t("verifyButton")}</Button>
      {msg && <p role="status" className="text-sm text-muted sm:col-span-4">{msg}</p>}
    </form>
  );
}

export function RevokeVerificationButton({ id }: { id: string }) {
  const t = useTranslations("admin");
  const { pending, run } = useRun();
  return <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => revokeListingVerification(id))}>{t("verifyRevoke")}</Button>;
}

export function FraudScanButton() {
  const t = useTranslations("admin");
  const [out, setOut] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="secondary" disabled={pending} onClick={() => start(async () => { const r = await runFraudScan(); if (r.data) setOut(t("fraudResult", { ...r.data })); router.refresh(); })}>{pending && <Loader2 className="size-4 animate-spin" aria-hidden />}{t("fraudScan")}</Button>
      {out && <span role="status" className="text-sm text-muted">{out}</span>}
    </div>
  );
}
