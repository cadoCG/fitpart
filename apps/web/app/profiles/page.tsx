"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CircleCheck, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  deleteProfile,
  listProfiles,
  renameProfile,
  setActiveProfile,
  type PrinterProfile,
} from "@/lib/profiles";
import { useUser } from "@/lib/useUser";

/** Drucker-Profile verwalten: aktiv setzen, umbenennen, löschen. */
export default function ProfilesPage() {
  const t = useTranslations("Profiles");
  const { user, loading } = useUser();
  const [profiles, setProfiles] = useState<PrinterProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setProfiles(await listProfiles());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!loading && user) void refresh();
    if (!loading && !user) setReady(true);
  }, [loading, user, refresh]);

  const act = async (fn: () => Promise<void>) => {
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div style={{ minHeight: "100%", background: "var(--surface-page)" }}>
      <main
        className="mx-auto"
        style={{ maxWidth: "var(--container-narrow)", padding: "var(--space-8) var(--space-6)" }}
      >
        <Link
          href="/create"
          className="fp-btn fp-btn--ghost fp-btn--sm"
          style={{ marginLeft: -12 }}
        >
          ← {t("back")}
        </Link>
        <h1
          style={{
            font: "var(--type-h1)",
            letterSpacing: "var(--tracking-heading)",
            margin: "var(--space-3) 0 0",
          }}
        >
          {t("title")}
        </h1>
        <p style={{ font: "var(--type-body-sm)", color: "var(--text-secondary)", margin: "var(--space-1) 0 0" }}>
          {t("subtitle")}
        </p>

        {!loading && !user && (
          <div className="fp-panel fp-panel--warn" style={{ marginTop: "var(--space-6)" }}>
            {t("needLogin")}{" "}
            <Link href="/login" className="font-medium underline">
              {t("loginLink")}
            </Link>
          </div>
        )}

        {error && (
          <div className="fp-panel fp-panel--error" style={{ marginTop: "var(--space-4)" }}>
            {error}
          </div>
        )}

        {user && ready && profiles.length === 0 && (
          <div className="fp-panel" style={{ marginTop: "var(--space-6)" }}>
            {t("empty")}{" "}
            <Link href="/calibrate" className="font-medium underline">
              {t("calibrateLink")}
            </Link>
          </div>
        )}

        <ul className="flex list-none flex-col p-0" style={{ gap: "var(--space-3)", marginTop: "var(--space-6)" }}>
          {profiles.map((p) => (
            <li
              key={p.id}
              className="fp-card fp-card--pad"
              style={
                p.is_active
                  ? {
                      borderColor: "var(--status-ok-border)",
                      background: "var(--status-ok-bg)",
                    }
                  : undefined
              }
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="active"
                  checked={p.is_active}
                  onChange={() => void act(() => setActiveProfile(p.id))}
                  title={t("setActive")}
                  style={{ width: 16, height: 16, accentColor: "var(--status-ok)" }}
                />
                <input
                  defaultValue={p.name}
                  onBlur={(e) => {
                    const name = e.target.value.trim();
                    if (name && name !== p.name)
                      void act(() => renameProfile(p.id, name));
                  }}
                  className="flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 font-medium transition hover:border-default focus:bg-surface-card focus:outline-none"
                  style={{ font: "var(--type-label)" }}
                />
                {p.is_active && (
                  <span className="fp-badge fp-badge--ok">
                    <CircleCheck size={13} strokeWidth={2.5} aria-hidden />
                    {t("active")}
                  </span>
                )}
                <button
                  onClick={() => {
                    if (window.confirm(t("deleteConfirm", { name: p.name })))
                      void act(() => deleteProfile(p.id));
                  }}
                  title={t("delete")}
                  aria-label={t("delete")}
                  className="transition hover:opacity-70"
                  style={{ color: "var(--status-error)" }}
                >
                  <X size={18} strokeWidth={2} aria-hidden />
                </button>
              </div>
              <dl
                className="flex flex-wrap"
                style={{
                  gap: "var(--space-1) var(--space-5)",
                  paddingLeft: 28,
                  marginTop: "var(--space-2)",
                  font: "var(--type-measure-sm)",
                  color: "var(--text-tertiary)",
                }}
              >
                <div>{t("nozzle")}: {Number(p.nozzle_mm).toFixed(1)} mm</div>
                <div>{t("hole")}: {Number(p.hole_offset_mm).toFixed(2)} mm</div>
                <div>{t("shaft")}: {Number(p.shaft_offset_mm).toFixed(2)} mm</div>
                <div>{t("slot")}: {Number(p.slot_offset_mm).toFixed(2)} mm</div>
              </dl>
            </li>
          ))}
        </ul>

        {user && (
          <Link href="/calibrate" className="fp-btn fp-btn--primary" style={{ marginTop: "var(--space-6)" }}>
            + {t("newProfile")}
          </Link>
        )}
      </main>
    </div>
  );
}
