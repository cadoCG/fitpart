/**
 * Einfaches In-Memory-Rate-Limit (Sliding Window) pro Schlüssel (z. B. IP).
 *
 * Bewusst ohne externe Abhängigkeit: reicht für eine einzelne Instanz
 * (VPS/Container). Bei horizontaler Skalierung oder Vercel-Serverless muss
 * das auf einen geteilten Store (Redis/Upstash) umziehen, weil jeder Prozess
 * sein eigenes Fenster hält.
 */

type Window = { limit: number; windowMs: number };

const buckets = new Map<string, number[]>();

// Aufräumen, damit die Map bei vielen IPs nicht unbegrenzt wächst.
const MAX_KEYS = 10_000;

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

/**
 * Prüft alle Fenster für `key` und zählt den Aufruf, wenn erlaubt.
 * Bei Ablehnung wird nichts gezählt (kein Bestrafen von Wartenden).
 */
export function checkRateLimit(
  key: string,
  windows: Window[],
  now = Date.now(),
): RateLimitResult {
  const stamps = buckets.get(key) ?? [];
  const oldestWindow = Math.max(...windows.map((w) => w.windowMs));
  const pruned = stamps.filter((t) => now - t < oldestWindow);

  for (const { limit, windowMs } of windows) {
    const inWindow = pruned.filter((t) => now - t < windowMs);
    if (inWindow.length >= limit) {
      const oldest = Math.min(...inWindow);
      return {
        ok: false,
        retryAfterSec: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
      };
    }
  }

  pruned.push(now);
  buckets.set(key, pruned);

  if (buckets.size > MAX_KEYS) {
    // Grob, aber wirksam: älteste Einträge verwerfen.
    for (const k of buckets.keys()) {
      if (buckets.size <= MAX_KEYS / 2) break;
      buckets.delete(k);
    }
  }
  return { ok: true };
}

/** Client-IP hinter Proxy/nginx; Fallback auf "unknown" (zählt gemeinsam). */
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}
