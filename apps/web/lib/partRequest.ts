import type { PartRequestInput } from "@fitpart/shared";

/**
 * "Kein passender Treffer"-Anfrage absenden (ADR-002). Geteilt zwischen dem
 * Foto-Flow (MeasureWizard) und dem "Ohne Foto"-Flow (PartRequestPanel).
 * Wirft mit der Server-Fehlermeldung, wenn der Insert fehlschlägt.
 */
export async function submitPartRequest(input: PartRequestInput): Promise<void> {
  const res = await fetch("/api/part-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.error ?? `HTTP ${res.status}`);
  }
}
