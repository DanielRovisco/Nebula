"use client";

import { FolderPlus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { createFolder, deleteFolder, moveFavorite, setFavoriteNote } from "@/server/favorites";

export function NewFolderForm() {
  const t = useTranslations("favorites");
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          await createFolder(name);
          setName("");
          router.refresh();
        });
      }}
    >
      <Input aria-label={t("folderName")} placeholder={t("newFolder")} value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} className="h-10" />
      <Button type="submit" size="icon" variant="secondary" disabled={pending} aria-label={t("create")} className="size-10 shrink-0">
        <FolderPlus aria-hidden />
      </Button>
    </form>
  );
}

export function DeleteFolderButton({ id }: { id: string }) {
  const t = useTranslations("favorites");
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label={t("deleteFolder")}
      className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-down"
      onClick={async () => {
        await deleteFolder(id);
        router.push("/conta/favoritos");
        router.refresh();
      }}
    >
      <Trash2 className="size-4" aria-hidden />
    </button>
  );
}

export function FavoriteItemControls({ propertyId, folderId, note, folders }: { propertyId: string; folderId: string | null; note: string | null; folders: { id: string; name: string }[] }) {
  const t = useTranslations("favorites");
  const router = useRouter();
  const [text, setText] = useState(note ?? "");
  const [pending, start] = useTransition();
  return (
    <div className="mt-2 space-y-2 px-1">
      <label className="block text-xs text-muted" htmlFor={`mv-${propertyId}`}>
        {t("move")}
      </label>
      <Select
        id={`mv-${propertyId}`}
        className="h-9 text-sm"
        defaultValue={folderId ?? ""}
        onChange={(e) =>
          start(async () => {
            await moveFavorite(propertyId, e.target.value || null);
            router.refresh();
          })
        }
      >
        <option value="">{t("noFolder")}</option>
        {folders.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </Select>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => void (await setFavoriteNote(propertyId, text)));
        }}
      >
        <Input aria-label={t("note")} placeholder={t("notePlaceholder")} value={text} onChange={(e) => setText(e.target.value)} maxLength={500} className="h-9 text-sm" />
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          {t("saveNote")}
        </Button>
      </form>
    </div>
  );
}
