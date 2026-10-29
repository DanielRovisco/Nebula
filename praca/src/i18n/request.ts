import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    // Dates and numbers follow pt-PT even for the English UI: the market is Portuguese.
    formats: { dateTime: { short: { day: "2-digit", month: "2-digit", year: "numeric" } } },
    timeZone: "Europe/Lisbon",
  };
});
