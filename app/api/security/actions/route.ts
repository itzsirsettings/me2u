import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  errorResponse,
  requireAuthenticatedUser,
  tooManyRequestsResponse,
} from "@/lib/server/auth";
import type { SecurityEventRow } from "@/lib/supabase/types";

type SecurityAction =
  | "freeze_wallet"
  | "unfreeze_wallet"
  | "report_fraud"
  | "request_recovery"
  | "review_trusted_device"
  | "review_session"
  | "start_mfa";

const eventTypeByAction: Record<SecurityAction, SecurityEventRow["type"]> = {
  freeze_wallet: "wallet_frozen",
  unfreeze_wallet: "wallet_unfrozen",
  report_fraud: "fraud_reported",
  request_recovery: "recovery_requested",
  review_trusted_device: "trusted_device_reviewed",
  review_session: "session_reviewed",
  start_mfa: "mfa_started",
};

function readAction(value: unknown): SecurityAction {
  const action = String(value || "").trim() as SecurityAction;
  if (action in eventTypeByAction) return action;
  throw new Error("Unsupported security action.");
}

export async function GET(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(`security-actions-get-ip:${clientIp}`, 60, 60_000)) return tooManyRequestsResponse();

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const [settingsResponse, eventsResponse] = await Promise.all([
      auth.supabase
        .from("user_security_settings")
        .select("*")
        .eq("user_id", auth.user.id)
        .maybeSingle(),
      auth.supabase
        .from("security_events")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    if (settingsResponse.error) throw new Error(settingsResponse.error.message);
    if (eventsResponse.error) throw new Error(eventsResponse.error.message);

    return NextResponse.json({
      ok: true,
      settings: settingsResponse.data || { user_id: auth.user.id, wallet_frozen: false },
      events: eventsResponse.data || [],
    });
  } catch (error) {
    return errorResponse(error, "Unable to load security settings.");
  }
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(`security-actions-post-ip:${clientIp}`, 30, 60_000)) return tooManyRequestsResponse();

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;
    if (isRateLimited(`security-actions-user:${auth.user.id}`, 20, 60_000)) return tooManyRequestsResponse();

    const body = await request.json().catch(() => ({}));
    const action = readAction(body.action);
    const detail = typeof body.detail === "string" ? body.detail.trim().slice(0, 500) : "";

    if (action === "freeze_wallet" || action === "unfreeze_wallet") {
      const { error: settingsError } = await auth.supabase
        .from("user_security_settings")
        .upsert(
          {
            user_id: auth.user.id,
            wallet_frozen: action === "freeze_wallet",
            trusted_device_label: typeof body.deviceLabel === "string" ? body.deviceLabel.slice(0, 120) : null,
          },
          { onConflict: "user_id" },
        );

      if (settingsError) throw new Error(settingsError.message);
    }

    const { error: eventError } = await auth.supabase.from("security_events").insert({
      user_id: auth.user.id,
      type: eventTypeByAction[action],
      detail: detail || null,
      metadata: {
        userAgent: request.headers.get("user-agent")?.slice(0, 180) || null,
        at: new Date().toISOString(),
      },
    });

    if (eventError) throw new Error(eventError.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to complete security action.");
  }
}
