import type { FitVerdict, PartRecordInput } from "@fitpart/shared";

/**
 * fit_feedback-Loop, Client-Seite: Downloads protokollieren und nach 48 h
 * in der App nachfragen ("Hat's gepasst?"). Für angemeldete User übernimmt
 * zusätzlich n8n die Mail (View feedback_due) – der localStorage-Pfad deckt
 * anonyme Nutzer ab und ist der In-App-Einstieg für alle.
 */

const LS_KEY = "fitpart.pendingFeedback.v1";
const ASK_AFTER_MS = 48 * 60 * 60 * 1000;
const MAX_ENTRIES = 20;

export type PendingFeedback = {
  token: string;
  archetype: string;
  /** Download-Zeitpunkt (Date.now()). */
  at: number;
};

function load(): PendingFeedback[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? (list as PendingFeedback[]) : [];
  } catch {
    return [];
  }
}

function save(list: PendingFeedback[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list.slice(0, MAX_ENTRIES)));
  } catch {
    // Speicher voll/blockiert → Feedback-Komfort entfällt, mehr nicht.
  }
}

/**
 * Download an /api/parts melden (fire-and-forget) und den Feedback-Token
 * lokal vormerken. Fehler werden geschluckt – das Protokoll darf den
 * Download nie stören.
 */
export async function recordDownload(input: PartRecordInput): Promise<void> {
  try {
    const res = await fetch("/api/parts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) return;
    const json = (await res.json()) as { feedback_token?: string };
    if (!json.feedback_token) return;
    save([
      { token: json.feedback_token, archetype: input.archetype, at: Date.now() },
      ...load(),
    ]);
  } catch {
    // bewusst still
  }
}

/** Ältester Download, der reif für die "Hat's gepasst?"-Frage ist. */
export function duePendingFeedback(now = Date.now()): PendingFeedback | null {
  const due = load().filter((e) => now - e.at >= ASK_AFTER_MS);
  return due.length ? due[due.length - 1] : null;
}

/** Eintrag nach abgegebenem Feedback (oder Dismiss) entfernen. */
export function resolvePendingFeedback(token: string): void {
  save(load().filter((e) => e.token !== token));
}

/** Verdict absenden. Wirft bei Server-Fehlern (UI zeigt Meldung). */
export async function submitFeedback(
  token: string,
  verdict: FitVerdict,
  offsetHintMm?: number,
  comment?: string,
): Promise<void> {
  const res = await fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      verdict,
      ...(offsetHintMm !== undefined ? { offset_hint_mm: offsetHintMm } : {}),
      ...(comment ? { comment } : {}),
    }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.error ?? `HTTP ${res.status}`);
  }
}
