/**
 * Header für Requests an den CAD-Service. Enthält das Shared-Secret (Härtung
 * Vercel ↔ CAD), sofern CAD_SHARED_SECRET gesetzt ist – sonst nur Content-Type,
 * damit lokales Dev ohne Secret weiter funktioniert. Server-only (kein
 * NEXT_PUBLIC_-Präfix → landet nie im Browser-Bundle).
 */
export function cadHeaders(): Record<string, string> {
  const secret = process.env.CAD_SHARED_SECRET;
  return {
    "Content-Type": "application/json",
    ...(secret ? { "X-CAD-Secret": secret } : {}),
  };
}
