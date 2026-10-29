import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["pt", "en"],
  defaultLocale: "pt",
  // pt-PT lives at the root, English under /en — hreflang pt-PT / en.
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
