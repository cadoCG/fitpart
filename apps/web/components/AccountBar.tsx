"use client";

import Link from "next/link";
import { Cloud } from "lucide-react";
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
        className="fp-card flex items-center gap-2"
        style={{
          padding: "var(--space-2) var(--space-3)",
          font: "var(--type-body-sm)",
          color: "var(--text-secondary)",
        }}
      >
        <Cloud size={16} strokeWidth={2} className="shrink-0" aria-hidden />
        {t("loginCta")}
      </Link>
    );
  }

  return (
    <div
      className="fp-card flex items-center justify-between gap-2"
      style={{ padding: "var(--space-2) var(--space-3)", font: "var(--type-body-sm)" }}
    >
      <span className="truncate" style={{ color: "var(--text-secondary)" }} title={user.email ?? ""}>
        {user.email}
      </span>
      <span className="flex shrink-0 items-center gap-3">
        <Link
          href="/profiles"
          style={{ fontWeight: 500, color: "var(--text-primary)" }}
          className="hover:underline"
        >
          {t("profiles")}
        </Link>
        <button
          onClick={async () => {
            await createClient().auth.signOut();
          }}
          style={{ color: "var(--text-tertiary)" }}
          className="transition hover:opacity-70"
        >
          {t("logout")}
        </button>
      </span>
    </div>
  );
}
