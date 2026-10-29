import { Compass } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <div className="mx-auto max-w-2xl px-4 py-24">
      <EmptyState
        icon={<Compass className="size-6" aria-hidden />}
        title={t("notFoundTitle")}
        text={t("notFoundText")}
        action={
          <Button asChild>
            <Link href="/">{t("backHome")}</Link>
          </Button>
        }
      />
    </div>
  );
}
