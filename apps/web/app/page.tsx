import Link from "next/link";
import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations("Home");

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-5xl font-bold tracking-tight">{t("title")}</h1>
      <p className="text-xl font-medium text-zinc-700">{t("tagline")}</p>
      <p className="text-zinc-500">{t("description")}</p>
      <Link
        href="/create"
        className="rounded-lg bg-zinc-900 px-6 py-3 font-medium text-white transition hover:bg-zinc-700"
      >
        {t("cta")}
      </Link>
    </main>
  );
}
