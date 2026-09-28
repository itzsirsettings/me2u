import { NextResponse } from "next/server";

import { errorResponse, requireAuthenticatedUser } from "@/lib/server/auth";
import { withFreshCsrfCookie } from "@/lib/server/auth-cookie";
import { logApiError } from "@/lib/server/logger";

async function loadRows<T>(
  db: { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }> },
  name: string,
  sql: string,
  userId: string,
): Promise<T[]> {
  try {
    const result = await db.query(sql, [userId]);
    return result.rows as T[];
  } catch (error) {
    logApiError(`auth-me-bootstrap-${name}`, error);
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const [transactions, loans, items, notifications] = await Promise.all([
      loadRows(
        auth.db,
        "transactions",
        `SELECT id, user_id, type, amount, description, created_at
         FROM transactions
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 100`,
        auth.user.id,
      ),
      loadRows(
        auth.db,
        "loans",
        `SELECT
           l.*,
           row_to_json(b.*) AS borrower,
           row_to_json(le.*) AS lender
         FROM loans l
         LEFT JOIN profiles b ON b.id = l.borrower_id
         LEFT JOIN profiles le ON le.id = l.lender_id
         WHERE l.borrower_id = $1 OR l.lender_id = $1
         ORDER BY l.created_at DESC`,
        auth.user.id,
      ),
      loadRows(
        auth.db,
        "marketplace",
        `SELECT *
         FROM marketplace_items
         WHERE status = 'active' OR author_id = $1
         ORDER BY created_at DESC`,
        auth.user.id,
      ),
      loadRows(
        auth.db,
        "notifications",
        `SELECT id, user_id, title, message, is_read, created_at
         FROM notifications
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        auth.user.id,
      ),
    ]);

    return withFreshCsrfCookie(
      request,
      NextResponse.json(
        { user: auth.user, transactions, loans, items, notifications },
        { headers: { "Cache-Control": "no-store" } },
      ),
    );
  } catch (error) {
    return errorResponse(error, "Unable to load account data.");
  }
}
