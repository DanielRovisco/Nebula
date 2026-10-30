"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const b64ToBytes = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export interface NotificationProps {
  pushAvailable: boolean;
  whatsappAvailable: boolean;
  whatsapp: { phone: string; verified: boolean } | null;
}

export function NotificationSettings({ pushAvailable, whatsappAvailable, whatsapp }: NotificationProps) {
  const t = useTranslations("notifications");
  const id = useId();
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [supported, setSupported] = useState(false);
  const [wa, setWa] = useState(whatsapp);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [waStep, setWaStep] = useState<"idle" | "code">(whatsapp && !whatsapp.verified ? "code" : "idle");
  const [waBusy, setWaBusy] = useState(false);

  useEffect(() => {
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(ok);
    if (!ok) return;
    navigator.serviceWorker.getRegistration().then((r) => r?.pushManager.getSubscription()).then((s) => setPushOn(!!s)).catch(() => {});
  }, []);

  async function togglePush() {
    setPushBusy(true);
    try {
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
      await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await fetch("/api/push", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: existing.endpoint }) });
        await existing.unsubscribe();
        setPushOn(false);
        toast.success(t("pushOff"));
        return;
      }
      if ((await Notification.requestPermission()) !== "granted") {
        toast.error(t("pushDenied"));
        return;
      }
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "") });
      const r = await fetch("/api/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      if (!r.ok) throw new Error(String(r.status));
      setPushOn(true);
      toast.success(t("pushOn"));
    } catch {
      toast.error(t("pushError"));
    } finally {
      setPushBusy(false);
    }
  }

  async function waCall(method: "POST" | "DELETE", body?: object) {
    setWaBusy(true);
    try {
      const r = await fetch("/api/whatsapp", { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      return { ok: r.ok, error: ((await r.json().catch(() => ({}))) as { error?: string }).error };
    } finally {
      setWaBusy(false);
    }
  }

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    const r = await waCall("POST", { action: "request", phone });
    if (r.ok) {
      setWaStep("code");
      setWa({ phone, verified: false });
      toast.success(t("waCodeSent"));
    } else toast.error(t(`waErr.${r.error === "invalid_phone" || r.error === "too_soon" ? r.error : "unavailable"}`));
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const r = await waCall("POST", { action: "verify", code });
    if (r.ok) {
      setWa((w) => (w ? { ...w, verified: true } : w));
      setWaStep("idle");
      setCode("");
      toast.success(t("waVerified"));
    } else toast.error(t(`waErr.${r.error === "expired" || r.error === "locked" ? r.error : "wrong"}`));
  }

  async function revoke() {
    await waCall("DELETE");
    setWa(null);
    setWaStep("idle");
    toast.success(t("waRemoved"));
  }

  return (
    <section aria-labelledby={`${id}-t`} className="rounded-[16px] border border-border bg-surface p-5">
      <h2 id={`${id}-t`} className="text-lg font-semibold">{t("title")}</h2>
      <p className="mt-1 text-sm text-muted">{t("sub")}</p>

      <div className="mt-5 border-t border-border pt-4">
        <h3 className="font-medium">{t("push")}</h3>
        {!pushAvailable ? (
          <p className="mt-1 text-sm text-muted">{t("pushUnavailable")}</p>
        ) : !supported ? (
          <p className="mt-1 text-sm text-muted">{t("pushUnsupported")}</p>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Button type="button" variant={pushOn ? "secondary" : "primary"} onClick={togglePush} disabled={pushBusy}>
              {pushBusy && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {pushOn ? t("pushDisable") : t("pushEnable")}
            </Button>
            <span className="text-sm text-muted" aria-live="polite">{pushOn ? t("pushActive") : t("pushInactive")}</span>
          </div>
        )}
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <h3 className="font-medium">WhatsApp</h3>
        {!whatsappAvailable ? (
          <p className="mt-1 text-sm text-muted">{t("waUnavailable")}</p>
        ) : wa?.verified ? (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="text-sm">{t("waActive", { phone: wa.phone })}</span>
            <Button type="button" variant="secondary" onClick={revoke} disabled={waBusy}>{t("waRemove")}</Button>
          </div>
        ) : waStep === "code" ? (
          <form onSubmit={verify} className="mt-2 flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor={`${id}-code`}>{t("waCode")}</Label>
              <Input id={`${id}-code`} inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="w-40" />
            </div>
            <Button type="submit" disabled={waBusy || code.length !== 6}>{t("waVerify")}</Button>
            <Button type="button" variant="ghost" onClick={revoke} disabled={waBusy}>{t("waCancel")}</Button>
          </form>
        ) : (
          <form onSubmit={requestCode} className="mt-2 space-y-2">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label htmlFor={`${id}-phone`}>{t("waPhone")}</Label>
                <Input id={`${id}-phone`} type="tel" autoComplete="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="912 345 678" className="w-56" />
              </div>
              <Button type="submit" disabled={waBusy || phone.trim().length < 9}>{t("waSend")}</Button>
            </div>
            <p className="text-xs text-muted">{t("waConsent")}</p>
          </form>
        )}
      </div>
    </section>
  );
}
