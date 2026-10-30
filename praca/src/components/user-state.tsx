"use client";

import { Check, Heart, Scale } from "lucide-react";
import { useTranslations } from "next-intl";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { toggleFavorite } from "@/server/favorites";

interface FavCtx {
  ids: Set<string>;
  auth: boolean | null;
  toggle: (propertyId: string) => Promise<void>;
}
const FavoritesContext = createContext<FavCtx>({ ids: new Set(), auth: null, toggle: async () => {} });

interface CmpCtx {
  refs: string[];
  toggle: (ref: string) => void;
  clear: () => void;
}
const CompareContext = createContext<CmpCtx>({ refs: [], toggle: () => {}, clear: () => {} });

const COMPARE_KEY = "praca.compare";
export const MAX_COMPARE = 4;

/** Favourites (server-backed, per user) and the comparison basket (localStorage, per browser). */
export function UserStateProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations("favorites");
  const router = useRouter();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [auth, setAuth] = useState<boolean | null>(null);
  const [refs, setRefs] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/favorites/ids")
      .then((r) => r.json())
      .then((d: { auth: boolean; ids: string[] }) => {
        setAuth(d.auth);
        setIds(new Set(d.ids));
      })
      .catch(() => setAuth(null));
    try {
      const raw = JSON.parse(localStorage.getItem(COMPARE_KEY) ?? "[]");
      if (Array.isArray(raw)) setRefs(raw.filter((x) => typeof x === "string").slice(0, MAX_COMPARE));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const toggle = useCallback(
    async (propertyId: string) => {
      if (auth === false) {
        toast(t("signInToSave"), { action: { label: t("signIn"), onClick: () => router.push("/entrar") } });
        return;
      }
      const was = ids.has(propertyId);
      setIds((s) => {
        const n = new Set(s);
        if (was) n.delete(propertyId);
        else n.add(propertyId);
        return n;
      }); // optimistic
      const r = await toggleFavorite(propertyId);
      if (!r.auth) {
        setAuth(false);
        setIds((s) => {
          const n = new Set(s);
          n.delete(propertyId);
          return n;
        });
        toast(t("signInToSave"), { action: { label: t("signIn"), onClick: () => router.push("/entrar") } });
      } else if (r.favorited !== undefined) {
        toast.success(r.favorited ? t("saved") : t("removed"));
      }
    },
    [auth, ids, router, t],
  );

  const persist = (next: string[]) => {
    setRefs(next);
    try {
      localStorage.setItem(COMPARE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };
  const cmp = useMemo<CmpCtx>(
    () => ({
      refs,
      toggle: (ref) => {
        if (refs.includes(ref)) return persist(refs.filter((r) => r !== ref));
        if (refs.length >= MAX_COMPARE) return void toast.error(t("compareMax", { n: MAX_COMPARE }));
        persist([...refs, ref]);
      },
      clear: () => persist([]),
    }),
     
    [refs, t],
  );

  return (
    <FavoritesContext.Provider value={{ ids, auth, toggle }}>
      <CompareContext.Provider value={cmp}>{children}</CompareContext.Provider>
    </FavoritesContext.Provider>
  );
}

export function FavoriteButton({ propertyId, className }: { propertyId: string; className?: string }) {
  const t = useTranslations("favorites");
  const { ids, toggle } = useContext(FavoritesContext);
  const on = ids.has(propertyId);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? t("remove") : t("save")}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle(propertyId);
      }}
      className={cn("relative z-10 flex size-10 items-center justify-center rounded-full bg-surface/95 shadow transition-transform active:scale-90", className)}
    >
      <Heart className={cn("size-[18px]", on ? "fill-down text-down" : "text-fg")} aria-hidden />
    </button>
  );
}

export function CompareToggle({ reference, className }: { reference: string; className?: string }) {
  const t = useTranslations("favorites");
  const { refs, toggle } = useContext(CompareContext);
  const on = refs.includes(reference.toLowerCase());
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? t("compareRemove") : t("compareAdd")}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(reference.toLowerCase());
      }}
      className={cn("relative z-10 flex size-10 items-center justify-center rounded-full shadow transition-colors", on ? "bg-brand text-brand-fg" : "bg-surface/95 text-fg", className)}
    >
      {on ? <Check className="size-[18px]" aria-hidden /> : <Scale className="size-[18px]" aria-hidden />}
    </button>
  );
}

export function CompareTray() {
  const t = useTranslations("favorites");
  const { refs, clear } = useContext(CompareContext);
  if (refs.length === 0) return null;
  return (
    <div className="no-print fixed inset-x-3 bottom-20 z-40 mx-auto flex max-w-md items-center justify-between gap-3 rounded-full border border-border-strong bg-surface px-5 py-2.5 shadow-[var(--shadow-lg)] md:bottom-5">
      <p className="text-sm font-medium">{t("compareCount", { n: refs.length, max: MAX_COMPARE })}</p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={clear} className="min-h-9 px-2 text-sm text-muted hover:text-fg">
          {t("compareClear")}
        </button>
        <Link href={`/comparar?r=${refs.join(",")}`} className="inline-flex min-h-9 items-center rounded-full bg-brand px-4 text-sm font-medium text-brand-fg hover:bg-brand-hover">
          {t("compareOpen")}
        </Link>
      </div>
    </div>
  );
}

export function useFavorites() {
  return useContext(FavoritesContext);
}
