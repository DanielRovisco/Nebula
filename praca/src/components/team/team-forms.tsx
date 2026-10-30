"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useActionState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { changeRole, createOrganization, inviteMember, removeMember, revokeInvitation, updateBrand, type TeamState } from "@/server/team";

const errKey = { auth: "errorAuth", invalid: "errorInvalid", permission: "errorPermission", seats: "errorSeats", exists: "errorExists", self: "errorSelf" } as const;

function Msg({ state, okKey }: { state: TeamState; okKey?: "saved" | "invited" }) {
  const t = useTranslations("team");
  if (state.error) return <p role="alert" className="text-sm text-down">{t(errKey[state.error])}</p>;
  if (state.ok && okKey) return <p role="status" className="text-sm text-up">{t(okKey)}</p>;
  return null;
}

export function CreateOrgForm() {
  const t = useTranslations("team");
  const router = useRouter();
  const [state, action, pending] = useActionState<TeamState, FormData>(async (p, f) => {
    const r = await createOrganization(p, f);
    if (r.ok) router.refresh();
    return r;
  }, {});
  return (
    <form action={action} className="mt-6 max-w-md space-y-3">
      <div>
        <Label htmlFor="org-name">{t("orgName")}</Label>
        <Input id="org-name" name="name" required minLength={2} maxLength={80} />
      </div>
      <Msg state={state} />
      <Button type="submit" disabled={pending}>{pending && <Loader2 className="animate-spin" aria-hidden />}{t("create")}</Button>
    </form>
  );
}

export function BrandForm({ org }: { org: { name: string; logoUrl: string | null; color: string | null; email: string | null; phone: string | null; website: string | null } }) {
  const t = useTranslations("team");
  const [state, action, pending] = useActionState<TeamState, FormData>(updateBrand, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><Label htmlFor="b-name">{t("orgName")}</Label><Input id="b-name" name="name" defaultValue={org.name} required minLength={2} maxLength={80} /></div>
      <div className="sm:col-span-2"><Label htmlFor="b-logo">{t("logoUrl")}</Label><Input id="b-logo" name="logoUrl" type="url" defaultValue={org.logoUrl ?? ""} placeholder="https://…" /></div>
      <div><Label htmlFor="b-color">{t("color")}</Label><Input id="b-color" name="brandColor" defaultValue={org.color ?? ""} placeholder="#1D3FB5" pattern="#[0-9a-fA-F]{6}" /></div>
      <div><Label htmlFor="b-email">{t("email")}</Label><Input id="b-email" name="email" type="email" defaultValue={org.email ?? ""} /></div>
      <div><Label htmlFor="b-phone">{t("phone")}</Label><Input id="b-phone" name="phone" type="tel" defaultValue={org.phone ?? ""} /></div>
      <div><Label htmlFor="b-web">{t("website")}</Label><Input id="b-web" name="website" type="url" defaultValue={org.website ?? ""} placeholder="https://…" /></div>
      <div className="flex items-center gap-3 sm:col-span-2"><Button type="submit" disabled={pending}>{t("saveBrand")}</Button><Msg state={state} okKey="saved" /></div>
    </form>
  );
}

export function InviteForm() {
  const t = useTranslations("team");
  const [state, action, pending] = useActionState<TeamState, FormData>(inviteMember, {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="min-w-56 flex-1"><Label htmlFor="i-email">{t("inviteEmail")}</Label><Input id="i-email" name="email" type="email" required /></div>
      <div><Label htmlFor="i-role">{t("inviteRole")}</Label><Select id="i-role" name="role" defaultValue="agent">{(["admin", "agent", "viewer"] as const).map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}</Select></div>
      <Button type="submit" disabled={pending}>{t("sendInvite")}</Button>
      <div className="w-full"><Msg state={state} okKey="invited" /></div>
    </form>
  );
}

export function RoleSelect({ membershipId, role, canEdit, canOwner }: { membershipId: string; role: string; canEdit: boolean; canOwner: boolean }) {
  const t = useTranslations("team");
  const router = useRouter();
  const [pending, start] = useTransition();
  if (!canEdit) return <span>{t(`roles.${role as "owner"}`)}</span>;
  return (
    <>
      <label className="sr-only" htmlFor={`r-${membershipId}`}>{t("colRole")}</label>
      <Select id={`r-${membershipId}`} className="h-9 w-auto text-sm" defaultValue={role} disabled={pending} onChange={(e) => start(async () => { await changeRole(membershipId, e.target.value as "owner"); router.refresh(); })}>
        {(canOwner ? (["owner", "admin", "agent", "viewer"] as const) : (["admin", "agent", "viewer"] as const)).map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
      </Select>
    </>
  );
}

export function RemoveMemberButton({ membershipId, self }: { membershipId: string; self: boolean }) {
  const t = useTranslations("team");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => { await removeMember(membershipId); router.refresh(); })}>
      <Trash2 aria-hidden />{self ? t("leave") : t("remove")}
    </Button>
  );
}

export function RevokeInviteButton({ id }: { id: string }) {
  const t = useTranslations("team");
  const router = useRouter();
  const [pending, start] = useTransition();
  return <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => { await revokeInvitation(id); router.refresh(); })}>{t("revoke")}</Button>;
}
