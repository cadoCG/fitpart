"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";

/** Schmale Konto-Leiste: Login-Link (anonym) bzw. E-Mail + Profile + Logout. */
export default function AccountBar() {
  const t = useTranslations("Auth");
  const { user, loading } = useUser();

  if (loading) return null;

  if (!user) {
    return (
      <Link
        href="/login"
        className="block rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 transition hover:border-zinc-400"
      >
        ☁️ {t("loginCta")}
      </Link>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm">
      <span className="truncate text-zinc-600" title={user.email ?? ""}>
        {user.email}
      </span>
      <span className="flex shrink-0 items-center gap-3">
        <Link href="/profiles" className="font-medium text-zinc-900 hover:underline">
          {t("profiles")}
        </Link>
        <button
          onClick={async () => {
            await createClient().auth.signOut();
          }}
          className="text-zinc-400 transition hover:text-zinc-700"
        >
          {t("logout")}
        </button>
      </span>
    </div>
  );
}
