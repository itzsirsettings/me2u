import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  errorResponse,
  requireAuthenticatedUser,
  tooManyRequestsResponse,
} from "@/lib/server/auth";

type SecurityAction =
  | "freeze_wallet"
  | "unfreeze_wallet"
  | "report_fraud"
  | "request_recovery"
  | "review_trusted_device"
  | "review_session"
  | "start_mfa";

const eventTypeByAction: Record<SecurityAction, string> = {
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

    const [settingsResult, eventsResult] = await Promise.all([
      auth.db.query(
        `SELECT * FROM user_security_settings WHERE user_id = $1`,
        [auth.user.id],
      ),
      auth.db.query(
        `SELECT id, user_id, type, detail, created_at
         FROM security_events
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 10`,
        [auth.user.id],
      ),
    ]);

    return NextResponse.json({
      ok: true,
      settings: settingsResult.rows[0] || { user_id: auth.user.id, wallet_frozen: false },
      events: eventsResult.rows,
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
      const frozen = action === "freeze_wallet";
      const deviceLabel =
        typeof body.deviceLabel === "string" ? body.deviceLabel.slice(0, 120) : null;

      await auth.db.query(
        `INSERT INTO user_security_settings (user_id, wallet_frozen, trusted_device_label, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET wallet_frozen = $2, trusted_device_label = COALESCE($3, user_security_settings.trusted_device_label), updated_at = NOW()`,
        [auth.user.id, frozen, deviceLabel],
      );
    }

    const metadata = JSON.stringify({
      userAgent: request.headers.get("user-agent")?.slice(0, 180) || null,
      at: new Date().toISOString(),
    });

    await auth.db.query(
      `INSERT INTO security_events (user_id, type, detail, metadata, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [auth.user.id, eventTypeByAction[action], detail || null, metadata],
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to complete security action.");
  }
}
