"use client";

import { Loader2, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { CONTACT_KINDS } from "@/lib/crm-constants";
import { addNote, addTask, createContact, createDeal, deleteContact, importContacts, toggleTask, type CrmResult } from "@/server/crm-actions";

const errMsg = (t: ReturnType<typeof useTranslations>, e?: string) => (e === "invalid" ? t("errorInvalid") : e === "not_found" ? t("errorNotFound") : e === "permission" ? t("errorPermission") : e === "plan" ? t("errorPlan") : e ? t("errorInvalid") : null);

export function NewDealForm({ contacts }: { contacts: { id: string; name: string }[] }) {
  const t = useTranslations("crm");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CrmResult, FormData>(async (p, f) => {
    const r = await createDeal(p, f);
    if (r.ok) {
      setOpen(false);
      router.refresh();
    }
    return r;
  }, { ok: false });
  if (!open) return <Button onClick={() => setOpen(true)}>{t("newDeal")}</Button>;
  return (
    <form action={action} className="grid gap-3 rounded-[16px] border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5">
      <div className="lg:col-span-2"><Label htmlFor="d-title">{t("dealTitle")}</Label><Input id="d-title" name="title" required minLength={2} maxLength={160} /></div>
      <div><Label htmlFor="d-contact">{t("dealContact")}</Label><Select id="d-contact" name="contactId"><option value="">{t("dealNoContact")}</option>{contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
      <div><Label htmlFor="d-prop">{t("dealProperty")}</Label><Input id="d-prop" name="propertyRef" placeholder="PR-000123" pattern="[Pp][Rr]-\d{6}" /></div>
      <div className="grid grid-cols-2 gap-2"><div><Label htmlFor="d-val">{t("dealValue")}</Label><Input id="d-val" name="value" type="number" min={0} inputMode="decimal" /></div><div><Label htmlFor="d-com">{t("dealCommission")}</Label><Input id="d-com" name="commissionPct" type="number" min={0} max={100} step="0.1" /></div></div>
      <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-5"><Button type="submit" disabled={pending}>{pending && <Loader2 className="animate-spin" aria-hidden />}{t("createDeal")}</Button><Button type="button" variant="ghost" onClick={() => setOpen(false)}>✕</Button>{errMsg(t, state.error) && <p role="alert" className="text-sm text-down">{errMsg(t, state.error)}</p>}</div>
    </form>
  );
}

export function NewContactForm({ defaultKind = "lead" }: { defaultKind?: string }) {
  const t = useTranslations("crm");
  const router = useRouter();
  const [state, action, pending] = useActionState<CrmResult, FormData>(async (p, f) => {
    const r = await createContact(p, f);
    if (r.ok) router.refresh();
    return r;
  }, { ok: false });
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div><Label htmlFor="c-name">{t("name")}</Label><Input id="c-name" name="name" required minLength={2} maxLength={160} /></div>
      <div><Label htmlFor="c-email">{t("email")}</Label><Input id="c-email" name="email" type="email" /></div>
      <div><Label htmlFor="c-phone">{t("phone")}</Label><Input id="c-phone" name="phone" type="tel" /></div>
      <div><Label htmlFor="c-kind">{t("kind")}</Label><Select id="c-kind" name="kind" defaultValue={defaultKind}>{CONTACT_KINDS.map((k) => <option key={k} value={k}>{t(`kinds.${k}`)}</option>)}</Select></div>
      <div><Label htmlFor="c-src">{t("source")}</Label><Input id="c-src" name="source" maxLength={120} /></div>
      <div><Label htmlFor="c-legal">{t("legalBasis")}</Label><Input id="c-legal" name="legalBasis" maxLength={200} /></div>
      <div className="sm:col-span-2"><Label htmlFor="c-tags">{t("tags")}</Label><Input id="c-tags" name="tags" maxLength={200} /></div>
      <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4"><Button type="submit" disabled={pending}>{t("createContact")}</Button>{state.ok && <span role="status" className="text-sm text-up">{t("contactCreated")}</span>}{errMsg(t, state.error) && <span role="alert" className="text-sm text-down">{errMsg(t, state.error)}</span>}</div>
    </form>
  );
}

export function ImportForm() {
  const t = useTranslations("crm");
  const router = useRouter();
  const [state, action, pending] = useActionState<CrmResult<{ imported: number; skipped: number; errors: string[] }>, FormData>(async (p, f) => {
    const r = await importContacts(p, f);
    if (r.ok) router.refresh();
    return r as CrmResult<{ imported: number; skipped: number; errors: string[] }>;
  }, { ok: false });
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div><Label htmlFor="imp">{t("importCsv")}</Label><Input id="imp" name="file" type="file" accept=".csv,text/csv" required className="h-auto py-2" /></div>
      <Button type="submit" variant="secondary" disabled={pending}><Upload aria-hidden />{t("importButton")}</Button>
      <p className="w-full text-xs text-muted">{t("importHint")}</p>
      {state.ok && state.data && <p role="status" className="w-full text-sm text-up">{t("imported", { imported: state.data.imported, skipped: state.data.skipped })}{state.data.errors.length > 0 && <span className="block text-xs text-muted">{state.data.errors.join(" · ")}</span>}</p>}
      {errMsg(t, state.error) && <p role="alert" className="w-full text-sm text-down">{errMsg(t, state.error)}</p>}
    </form>
  );
}

export function DeleteContactButton({ id }: { id: string }) {
  const t = useTranslations("crm");
  const router = useRouter();
  const [pending, start] = useTransition();
  return <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => { await deleteContact(id); router.refresh(); })}><Trash2 aria-hidden /><span className="sr-only">{t("delete")}</span></Button>;
}

export function NoteForm({ dealId }: { dealId: string }) {
  const t = useTranslations("crm");
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  return (
    <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await addNote(dealId, text); if (r.ok) { setText(""); router.refresh(); } }); }}>
      <Label htmlFor="note" className="sr-only">{t("addNote")}</Label>
      <Textarea id="note" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("notePlaceholder")} maxLength={4000} required />
      <Button type="submit" size="sm" disabled={pending || !text.trim()}>{t("addNote")}</Button>
    </form>
  );
}

export function TaskForm({ dealId }: { dealId: string | null }) {
  const t = useTranslations("crm");
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [pending, start] = useTransition();
  return (
    <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await addTask(dealId, title, due || null); if (r.ok) { setTitle(""); setDue(""); router.refresh(); } }); }}>
      <div className="min-w-48 flex-1"><Label htmlFor="t-title" className="sr-only">{t("taskTitle")}</Label><Input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("taskTitle")} required maxLength={200} /></div>
      <div><Label htmlFor="t-due" className="sr-only">{t("taskDue")}</Label><Input id="t-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
      <Button type="submit" size="sm" disabled={pending || !title.trim()}>{t("addTask")}</Button>
    </form>
  );
}

export function TaskToggle({ id, done, title }: { id: string; done: boolean; title: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return <input type="checkbox" checked={done} disabled={pending} aria-label={title} className="size-5 accent-[var(--brand)]" onChange={() => start(async () => { await toggleTask(id); router.refresh(); })} />;
}
