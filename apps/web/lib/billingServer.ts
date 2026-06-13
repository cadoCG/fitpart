import { createHash } from "crypto";

/**
 * Stabiler Identitäts-Hash eines Teils (Server-only). Identität = Archetyp +
 * Nennparameter; unabhängig von Toleranzprofil/Format, damit Re-Download in
 * jedem Format gratis bleibt. Schlüssel rekursiv sortieren → deterministisch.
 */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = canonical((value as Record<string, unknown>)[k]);
        return acc;
      }, {});
  }
  return value;
}

export function partIdentityHash(
  archetype: string,
  params: Record<string, unknown>,
): string {
  const payload = JSON.stringify({ archetype, params: canonical(params) });
  return createHash("sha256").update(payload).digest("hex").slice(0, 32);
}
