"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

const KEY = "praca.consent.v1";
const EVENT = "praca:consent-open";

export interface Consent {
  analytics: boolean;
  version: string;
  at: string;
}

export const CONSENT_VERSION = "2025-01";

function read(): Consent | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Consent;
    return v.version === CONSENT_VERSION ? v : null;
  } catch {
    return null;
  }
}

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
};
let cache: { raw: string | null; value: Consent | null } = { raw: undefined as unknown as null, value: null };
function snapshot(): Consent | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    /* private mode */
  }
  if (cache.raw !== raw) cache = { raw, value: read() };
  return cache.value;
}

export function useConsent(): Consent | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}

async function record(analytics: boolean) {
  try {
    await fetch("/api/consent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ purpose: "cookies_analytics", granted: analytics, version: CONSENT_VERSION }),
      keepalive: true,
    });
  } catch {
    /* proof of consent is best effort; the choice itself is stored locally */
  }
}

function save(analytics: boolean) {
  const c: Consent = { analytics, version: CONSENT_VERSION, at: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
  void record(analytics);
}

export function CookieSettingsButton({ className }: { className?: string }) {
  const t = useTranslations("cookies");
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(EVENT))}>
      {t("reopen")}
    </button>
  );
}

export function CookieConsent() {
  const t = useTranslations("cookies");
  const consent = useConsent();
  const [mounted, setMounted] = useState(false);
  const [forced, setForced] = useState(false);
  const [custom, setCustom] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    setMounted(true);
    const open = () => {
      setForced(true);
      setCustom(true);
      setAnalytics(read()?.analytics ?? false);
    };
    window.addEventListener(EVENT, open);
    return () => window.removeEventListener(EVENT, open);
  }, []);

  const close = useCallback(() => {
    setForced(false);
    setCustom(false);
  }, []);

  if (!mounted || (consent && !forced)) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-title"
      className="no-print fixed inset-x-3 bottom-20 z-50 mx-auto max-w-xl rounded-[16px] border border-border-strong bg-surface p-5 shadow-[var(--shadow-lg)] md:bottom-4 md:left-4 md:right-auto"
    >
      <h2 id="cookie-title" className="text-base font-semibold">
        {t("title")}
      </h2>
      <p className="mt-1.5 text-sm text-muted">
        {t("text")}{" "}
        <Link href="/cookies" className="text-brand underline underline-offset-2">
          {t("more")}
        </Link>
      </p>
      {custom && (
        <div className="mt-4 space-y-3">
          <div className="flex items-start justify-between gap-4 rounded-[12px] bg-surface-2 p-3">
            <div>
              <p className="text-sm font-medium">{t("necessary")}</p>
              <p className="text-xs text-muted">{t("necessaryText")}</p>
            </div>
            <input type="checkbox" checked disabled aria-label={t("necessary")} className="mt-1 size-5 accent-[var(--brand)]" />
          </div>
          <label className="flex cursor-pointer items-start justify-between gap-4 rounded-[12px] bg-surface-2 p-3">
            <span>
              <span className="block text-sm font-medium">{t("analytics")}</span>
              <span className="block text-xs text-muted">{t("analyticsText")}</span>
            </span>
            <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="mt-1 size-5 accent-[var(--brand)]" />
          </label>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {custom ? (
          <Button
            size="sm"
            onClick={() => {
              save(analytics);
              close();
            }}
          >
            {t("savePrefs")}
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              onClick={() => {
                save(true);
                close();
              }}
            >
              {t("acceptAll")}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                save(false);
                close();
              }}
            >
              {t("rejectAll")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCustom(true)}>
              {t("customize")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
