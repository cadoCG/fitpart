"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/create" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← {t("back")}
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{t("title")}</h1>
      <p className="mt-1 text-sm text-zinc-500">{t("subtitle")}</p>

      {!loading && !user && (
        <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t("needLogin")}{" "}
          <Link href="/login" className="font-medium underline">
            {t("loginLink")}
          </Link>
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {user && ready && profiles.length === 0 && (
        <p className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          {t("empty")}{" "}
          <Link href="/calibrate" className="font-medium underline">
            {t("calibrateLink")}
          </Link>
        </p>
      )}

      <ul className="mt-6 space-y-3">
        {profiles.map((p) => (
          <li
            key={p.id}
            className={`rounded-xl border p-4 transition ${
              p.is_active
                ? "border-emerald-300 bg-emerald-50"
                : "border-zinc-200 bg-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="active"
                checked={p.is_active}
                onChange={() => void act(() => setActiveProfile(p.id))}
                className="size-4 accent-emerald-600"
                title={t("setActive")}
              />
              <input
                defaultValue={p.name}
                onBlur={(e) => {
                  const name = e.target.value.trim();
                  if (name && name !== p.name)
                    void act(() => renameProfile(p.id, name));
                }}
                className="flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-medium transition hover:border-zinc-300 focus:border-zinc-900 focus:bg-white focus:outline-none"
              />
              {p.is_active && (
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
                  {t("active")}
                </span>
              )}
              <button
                onClick={() => {
                  if (window.confirm(t("deleteConfirm", { name: p.name })))
                    void act(() => deleteProfile(p.id));
                }}
                className="text-zinc-400 transition hover:text-red-600"
                title={t("delete")}
              >
                ✕
              </button>
            </div>
            <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 pl-7 text-xs tabular-nums text-zinc-500">
              <div>
                {t("nozzle")}: {Number(p.nozzle_mm).toFixed(1)} mm
              </div>
              <div>
                {t("hole")}: {Number(p.hole_offset_mm).toFixed(2)} mm
              </div>
              <div>
                {t("shaft")}: {Number(p.shaft_offset_mm).toFixed(2)} mm
              </div>
              <div>
                {t("slot")}: {Number(p.slot_offset_mm).toFixed(2)} mm
              </div>
            </dl>
          </li>
        ))}
      </ul>

      {user && (
        <Link
          href="/calibrate"
          className="mt-6 inline-block rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700"
        >
          + {t("newProfile")}
        </Link>
      )}
    </main>
  );
}
