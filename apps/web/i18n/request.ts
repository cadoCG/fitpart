import { getRequestConfig } from "next-intl/server";

// Deutsch-first (de-CH), Eiserne Regel 6. Weitere Locales später via Routing.
export default getRequestConfig(async () => {
  const locale = "de-CH";
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
