"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button, Field, Input, Panel } from "@/components/ui";

/** Login per Magic Link (passwortlos). Callback: /auth/callback (PKCE). */
export default function LoginPage() {
  const t = useTranslations("Auth");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fehler aus dem Callback (?error=link), ohne useSearchParams/Suspense.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "link") {
      setError(t("errorLink"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/create`,
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (e) {
      setError(
        `${t("errorSend")}: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      className="mx-auto flex min-h-screen flex-col justify-center"
      style={{ maxWidth: 448, padding: "var(--space-10) var(--space-6)" }}
    >
      <Link
        href="/create"
        className="fp-btn fp-btn--ghost fp-btn--sm self-start"
        style={{ marginLeft: -12, marginBottom: "var(--space-4)" }}
      >
        ← {t("back")}
      </Link>
      <h1 style={{ font: "var(--type-h1)", letterSpacing: "var(--tracking-heading)", margin: 0 }}>
        {t("title")}
      </h1>
      <p style={{ font: "var(--type-body-sm)", color: "var(--text-secondary)", margin: "var(--space-1) 0 0" }}>
        {t("subtitle")}
      </p>

      {sent ? (
        <div style={{ marginTop: "var(--space-6)" }}>
          <Panel variant="ok" icon={<Mail size={18} strokeWidth={2} aria-hidden />}>
            {t("sent", { email })}
          </Panel>
        </div>
      ) : (
        <form
          onSubmit={submit}
          className="flex flex-col"
          style={{ gap: "var(--space-3)", marginTop: "var(--space-6)" }}
        >
          <Field>
            <Input
              type="email"
              required
              autoFocus
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Button type="submit" block disabled={!email} loading={busy}>
            {busy ? t("sending") : t("send")}
          </Button>
        </form>
      )}

      {error && (
        <div className="fp-panel fp-panel--error" style={{ marginTop: "var(--space-4)" }}>
          {error}
        </div>
      )}
    </main>
  );
}
