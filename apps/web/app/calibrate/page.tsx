import { useTranslations } from "next-intl";
import Link from "next/link";
import CalibrationFlow from "@/components/CalibrationFlow";

export default function CalibratePage() {
  const t = useTranslations("Calibrate");
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8">
        <Link href="/create" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← {t("back")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-zinc-600">{t("subtitle")}</p>
      </header>
      <CalibrationFlow />
    </main>
  );
}
