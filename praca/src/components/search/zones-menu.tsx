"use client";

import { Layers, Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Link } from "@/i18n/navigation";
import { decodeZones, encodeZones, type Ring } from "@/lib/zones";
import { deleteZone, listSavedZones, saveZone, type SavedZone } from "@/server/zones";

export function ZonesMenu({ zones, onUse }: { zones: Ring[]; onUse: (z: Ring[]) => void }) {
  const t = useTranslations("search");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SavedZone[] | null>(null);
  const [auth, setAuth] = useState(true);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const r = await listSavedZones();
    setAuth(r.auth);
    setItems(r.items);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) void load();
      }}
    >
      <PopoverTrigger asChild>
        <Button size="sm" variant="secondary" className="shadow-[var(--shadow-md)]">
          <Layers aria-hidden />
          {t("zonesMenu")}
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <h3 className="mb-2 text-sm font-semibold">{t("savedZones")}</h3>
        {!auth ? (
          <p className="text-sm text-muted">
            <Link href="/entrar" className="text-brand underline underline-offset-2">
              {t("zonesLogin")}
            </Link>
          </p>
        ) : items === null ? (
          <Loader2 className="size-4 animate-spin text-muted" aria-hidden />
        ) : items.length === 0 ? (
          <p className="text-sm text-muted">{t("noSavedZones")}</p>
        ) : (
          <ul className="max-h-48 space-y-1 overflow-auto">
            {items.map((z) => (
              <li key={z.id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm">{z.name}</span>
                <Button size="sm" variant="soft" onClick={() => { onUse(decodeZones(z.zones)); setOpen(false); }}>
                  {t("useZone")}
                </Button>
                <button
                  type="button"
                  aria-label={t("deleteZone")}
                  className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-down"
                  onClick={async () => {
                    await deleteZone(z.id);
                    await load();
                  }}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        {auth && zones.length > 0 && (
          <form
            className="mt-3 flex gap-2 border-t border-border pt-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              const r = await saveZone({ name, zones: encodeZones(zones) });
              setBusy(false);
              if (r.ok) {
                toast.success(t("zoneSaved"));
                setName("");
                await load();
              }
            }}
          >
            <Input aria-label={t("saveZoneName")} placeholder={t("saveZoneName")} value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} className="h-9" />
            <Button size="sm" type="submit" disabled={busy}>
              {t("saveZone")}
            </Button>
          </form>
        )}
      </PopoverContent>
    </Popover>
  );
}
