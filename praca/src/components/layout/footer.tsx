import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/logo";
import { Link } from "@/i18n/navigation";
import { entity } from "@/lib/env";
import { CookieSettingsButton } from "./cookie-consent";

export async function Footer() {
  const t = await getTranslations("footer");
  const nav = await getTranslations("nav");
  const col = "flex flex-col gap-2.5 text-sm";
  const a = "text-muted hover:text-fg";
  return (
    <footer className="mt-24 border-t border-border bg-surface-2/50 pb-24 md:pb-0">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="max-w-xs space-y-4">
          <Logo />
          <p className="text-sm text-muted">{t("dataNote")}</p>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">{t("explore")}</h2>
          <ul className={col}>
            <li><Link className={a} href="/comprar">{nav("buy")}</Link></li>
            <li><Link className={a} href="/arrendar">{nav("rent")}</Link></li>
            <li><Link className={a} href="/mercado">{nav("market")}</Link></li>
            <li><Link className={a} href="/metodologia">{t("methodology")}</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">{t("company")}</h2>
          <ul className={col}>
            <li><Link className={a} href="/sobre">{t("about")}</Link></li>
            <li><Link className={a} href="/contactos">{t("contacts")}</Link></li>
            <li>
              <a className={a} href="https://www.livroreclamacoes.pt" target="_blank" rel="noopener noreferrer">
                {t("complaints")}
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">{t("legal")}</h2>
          <ul className={col}>
            <li><Link className={a} href="/termos">{t("terms")}</Link></li>
            <li><Link className={a} href="/privacidade">{t("privacy")}</Link></li>
            <li><Link className={a} href="/cookies">{t("cookies")}</Link></li>
            <li><CookieSettingsButton className={a} /></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-1 px-4 py-5 text-xs text-muted sm:px-6 md:flex-row md:justify-between">
          <p>
            © {new Date().getFullYear()} {entity.name}. {t("rights")}
          </p>
          <p>
            {entity.nif && <span>NIF {entity.nif} · </span>}
            {entity.ami ? (
              <span>
                {t("ami")} {entity.ami}
              </span>
            ) : null}
            {entity.address && <span> · {entity.address}</span>}
          </p>
        </div>
      </div>
    </footer>
  );
}
