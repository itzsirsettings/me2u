import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  errorResponse,
  requireAuthenticatedUser,
  tooManyRequestsResponse,
  readPositiveAmount,
} from "@/lib/server/auth";
import { verifyTransactionPin } from "@/lib/server/pin";
import { withUserTransaction } from "@/lib/railway/client";
import type { PoolClient } from "pg";

async function assertWalletNotFrozen(userId: string, client: PoolClient) {
  const { rows } = await client.query<{ wallet_frozen: boolean }>(
    `SELECT wallet_frozen FROM user_security_settings WHERE user_id = $1`,
    [userId],
  );
  if (rows[0]?.wallet_frozen) {
    throw new Error("Your wallet is frozen. Unfreeze it from Security Center before using circles.");
  }
}

export async function GET(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(`circles-get-ip:${clientIp}`, 30, 60_000)) {
      return tooManyRequestsResponse();
    }

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const { rows: profileRows } = await auth.db.query<{ group_lending_enabled: boolean }>(
      `SELECT group_lending_enabled FROM profiles WHERE id = $1`,
      [auth.user.id],
    );
    const profile = profileRows[0];

    if (!profile?.group_lending_enabled) {
      return NextResponse.json({ ok: true, circles: [] });
    }

    const { rows } = await auth.db.query(
      `SELECT * FROM circles ORDER BY created_at ASC`,
    );

    return NextResponse.json({ ok: true, circles: rows });
  } catch (error) {
    return errorResponse(error, "Unable to load circles.");
  }
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(`circles-post-ip:${clientIp}`, 30, 60_000)) {
      return tooManyRequestsResponse();
    }

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    // Load profile fields needed for all actions
    const { rows: profileRows } = await auth.db.query<{
      group_lending_enabled: boolean;
      kyc_verified: boolean;
      transaction_pin: string | null;
    }>(
      `SELECT group_lending_enabled, kyc_verified, transaction_pin FROM profiles WHERE id = $1`,
      [auth.user.id],
    );
    const profile = profileRows[0];
    if (!profile) throw new Error("Profile not found.");
    if (!profile.group_lending_enabled) {
      throw new Error("Enable group lending before using Me2U Circles.");
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "").trim().toLowerCase();

    if (action === "create") {
      const name = String(body.name || "").trim();
      if (!name) throw new Error("Circle name is required.");

      const { rows } = await auth.db.query(
        `WITH new_circle AS (
           INSERT INTO circles (name, creator_id, pool_balance, created_at, updated_at)
           VALUES ($1, $2, 0, NOW(), NOW())
           RETURNING *
         )
         INSERT INTO circle_members (circle_id, user_id, joined_at)
         SELECT id, $2, NOW() FROM new_circle
         RETURNING (SELECT row_to_json(new_circle) FROM new_circle) AS circle`,
        [name, auth.user.id],
      );

      // Re-fetch the circle to get a clean object
      const circleId = (rows[0]?.circle as { id: string } | null)?.id;
      const { rows: circleRows } = await auth.db.query(
        `SELECT * FROM circles WHERE id = $1`,
        [circleId],
      );

      return NextResponse.json({ ok: true, circle: circleRows[0] });
    }

    if (action === "contribute") {
      const circleId = String(body.circleId || "").trim();
      const amount = readPositiveAmount(body.amount, "Contribution amount");
      const pin = typeof body.pin === "string" ? body.pin.trim() : "";

      if (!circleId) throw new Error("Circle ID is required.");
      if (!profile.kyc_verified) throw new Error("Complete KYC before contributing to a circle.");
      if (!profile.transaction_pin) throw new Error("Set a transaction PIN before contributing to a circle.");
      if (!verifyTransactionPin(profile.transaction_pin, auth.user.id, pin)) {
        throw new Error("Incorrect transaction PIN.");
      }

      const userId = auth.user.id;
      const newPoolBalance = await withUserTransaction(userId, async (client) => {
        await assertWalletNotFrozen(userId, client);

        // Deduct from wallet (atomic)
        const { rows: walletRows } = await client.query(
          `UPDATE wallets
           SET balance = balance - $1, updated_at = NOW()
           WHERE user_id = $2 AND balance >= $1
           RETURNING balance`,
          [amount, userId],
        );
        if (!walletRows[0]) throw new Error("Insufficient wallet balance for contribution.");

        // Add to circle pool
        const { rows: circleRows } = await client.query(
          `UPDATE circles
           SET pool_balance = pool_balance + $1, updated_at = NOW()
           WHERE id = $2
           RETURNING pool_balance`,
          [amount, circleId],
        );
        if (!circleRows[0]) throw new Error("Circle not found.");

        // Transaction record
        const { rows: nameRows } = await client.query(
          `SELECT name FROM circles WHERE id = $1`,
          [circleId],
        );
        await client.query(
          `INSERT INTO transactions (user_id, type, amount, description, created_at)
           VALUES ($1, 'investment', $2, $3, NOW())`,
          [userId, amount, `Contributed to ${nameRows[0]?.name ?? "circle"} pool`],
        );

        return Number(circleRows[0].pool_balance);
      });

      return NextResponse.json({ ok: true, newPoolBalance });
    }

    if (action === "borrow") {
      const circleId = String(body.circleId || "").trim();
      const amount = readPositiveAmount(body.amount, "Borrow amount");
      const pin = typeof body.pin === "string" ? body.pin.trim() : "";

      if (!circleId) throw new Error("Circle ID is required.");
      if (!profile.kyc_verified) throw new Error("Complete KYC before borrowing from a circle.");
      if (!profile.transaction_pin) throw new Error("Set a transaction PIN before borrowing from a circle.");
      if (!verifyTransactionPin(profile.transaction_pin, auth.user.id, pin)) {
        throw new Error("Incorrect transaction PIN.");
      }

      const userId = auth.user.id;
      const result = await withUserTransaction(userId, async (client) => {
        await assertWalletNotFrozen(userId, client);

        // Deduct from circle pool (atomic, with pool balance check)
        const { rows: circleRows } = await client.query(
          `UPDATE circles
           SET pool_balance = pool_balance - $1, updated_at = NOW()
           WHERE id = $2 AND pool_balance >= $1
           RETURNING pool_balance, name`,
          [amount, circleId],
        );
        if (!circleRows[0]) {
          throw new Error("Insufficient funds in circle pool to fulfill this borrow request.");
        }

        // Credit wallet
        await client.query(
          `UPDATE wallets
           SET balance = balance + $1, updated_at = NOW()
           WHERE user_id = $2`,
          [amount, userId],
        );

        // Create loan record
        const startDate = new Date().toISOString();
        const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        await client.query(
          `INSERT INTO loans (borrower_id, amount, rate, days, status, funding_source, start_date, due_date, created_at)
           VALUES ($1, $2, 0, 30, 'active', 'peer_lender', $3, $4, NOW())`,
          [userId, amount, startDate, dueDate],
        );

        // Transaction record
        await client.query(
          `INSERT INTO transactions (user_id, type, amount, description, created_at)
           VALUES ($1, 'loan_disbursed', $2, $3, NOW())`,
          [userId, amount, `Borrowed from ${circleRows[0].name} pool`],
        );

        return {
          newPoolBalance: Number(circleRows[0].pool_balance),
        };
      });

      return NextResponse.json({ ok: true, ...result });
    }

    throw new Error("Invalid circle action.");
  } catch (error) {
    return errorResponse(error, "Failed to complete circle action.");
  }
}
