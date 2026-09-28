import { NextResponse } from "next/server";

import { verifyPassword } from "@/lib/railway/auth";
import {
  deletionEstimateFrom,
  getAccountDeletionTargetDays,
  type AccountDeletionRequest,
} from "@/lib/server/account-deletion";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { logApiError } from "@/lib/server/logger";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const { rows } = await auth.db.query<AccountDeletionRequest>(
      `SELECT id, status, requested_at, estimated_completion_at
         FROM account_deletion_requests
        WHERE user_id = $1 AND status IN ('requested', 'in_review')
        ORDER BY requested_at DESC
        LIMIT 1`,
      [auth.user.id],
    );
    const deletion = rows[0];
    return NextResponse.json(
      {
        request: deletion
          ? {
              id: deletion.id,
              status: deletion.status,
              requestedAt: deletion.requested_at,
              estimatedCompletionAt: deletion.estimated_completion_at,
            }
          : null,
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    logApiError("account.deletion.read", error);
    return NextResponse.json(
      { error: "Unable to load account deletion status." },
      { status: 500, headers: NO_STORE },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const payload: unknown = await request.json().catch(() => null);
    const body = typeof payload === "object" && payload !== null ? payload : {};
    const currentPassword =
      "currentPassword" in body && typeof body.currentPassword === "string"
        ? body.currentPassword
        : "";
    const confirmation =
      "confirmation" in body && typeof body.confirmation === "string" ? body.confirmation : "";
    if (!currentPassword || confirmation !== "DELETE") {
      return NextResponse.json(
        { error: "Enter your current password and type DELETE to confirm." },
        { status: 400, headers: NO_STORE },
      );
    }

    const targetDays = getAccountDeletionTargetDays();
    if (!targetDays) {
      return NextResponse.json(
        { error: "Account deletion timing is not configured. Please contact support." },
        { status: 503, headers: NO_STORE },
      );
    }

    const { rows: authRows } = await auth.db.query<{ password_hash: string }>(
      `SELECT password_hash FROM auth_users WHERE id = $1 LIMIT 1`,
      [auth.user.id],
    );
    if (!authRows[0] || !(await verifyPassword(currentPassword, authRows[0].password_hash))) {
      return NextResponse.json(
        { error: "Your current password could not be verified." },
        { status: 403, headers: NO_STORE },
      );
    }

    const estimatedCompletionAt = deletionEstimateFrom(new Date(), targetDays);
    const { rows } = await auth.db.query<AccountDeletionRequest>(
      `INSERT INTO account_deletion_requests
         (user_id, status, requested_at, estimated_completion_at, updated_at)
       VALUES ($1, 'requested', NOW(), $2, NOW())
       ON CONFLICT (user_id) WHERE status IN ('requested', 'in_review')
       DO UPDATE SET updated_at = NOW()
       RETURNING id, status, requested_at, estimated_completion_at`,
      [auth.user.id, estimatedCompletionAt.toISOString()],
    );
    const deletion = rows[0];
    if (!deletion) throw new Error("Account deletion request was not saved.");

    return NextResponse.json(
      {
        request: {
          id: deletion.id,
          status: deletion.status,
          requestedAt: deletion.requested_at,
          estimatedCompletionAt: deletion.estimated_completion_at,
        },
        message:
          "Your request has been received. We will review open financial obligations and legally required records before completing deletion. You can continue to sign in to make repayments and contact support.",
      },
      { status: 202, headers: NO_STORE },
    );
  } catch (error) {
    logApiError("account.deletion.create", error);
    return NextResponse.json(
      { error: "Unable to submit your account deletion request." },
      { status: 500, headers: NO_STORE },
    );
  }
}
