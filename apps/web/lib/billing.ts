import {
  BillingState,
  type ExportFormat,
  type ToleranceProfile,
} from "@fitpart/shared";

/**
 * Billing-Client (Pay-per-Part). Guthaben abrufen und Teile über den gegateten
 * /api/download-Endpoint herunterladen (Credit ziehen oder bereits frei).
 */

export async function fetchBillingState(): Promise<BillingState | null> {
  try {
    const res = await fetch("/api/billing/state", { cache: "no-store" });
    if (!res.ok) return null;
    const parsed = BillingState.safeParse(await res.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export type DownloadOk = {
  ok: true;
  blob: Blob;
  credits: number;
  feedbackToken: string | null;
};
export type DownloadErr = {
  ok: false;
  status: number;
  reason: "auth_required" | "no_credits" | "error";
};
export type DownloadResult = DownloadOk | DownloadErr;

export async function downloadPart(input: {
  archetype: string;
  params: Record<string, unknown>;
  tolerance_profile?: ToleranceProfile;
  format: ExportFormat;
}): Promise<DownloadResult> {
  let res: Response;
  try {
    res = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    return { ok: false, status: 0, reason: "error" };
  }

  if (res.ok) {
    return {
      ok: true,
      blob: await res.blob(),
      credits: Number(res.headers.get("X-Credits-Remaining") ?? "0"),
      feedbackToken: res.headers.get("X-Feedback-Token"),
    };
  }
  if (res.status === 401) return { ok: false, status: 401, reason: "auth_required" };
  if (res.status === 402) return { ok: false, status: 402, reason: "no_credits" };
  return { ok: false, status: res.status, reason: "error" };
}
