import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  errorResponse,
  readPositiveAmount,
  requireAuthenticatedUser,
  tooManyRequestsResponse,
} from "@/lib/server/auth";
import { withUserTransaction } from "@/lib/railway/client";

async function assertWalletNotFrozen(userId: string, client: import("pg").PoolClient) {
  const { rows } = await client.query<{ wallet_frozen: boolean }>(
    `SELECT wallet_frozen FROM user_security_settings WHERE user_id = $1`,
    [userId],
  );
  if (rows[0]?.wallet_frozen) {
    throw new Error("Your wallet is frozen. Unfreeze it from Security Center before moving savings.");
  }
}

export async function GET(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (await isRateLimited(`savings-get-ip:${clientIp}`, 300, 15 * 60_000)) return tooManyRequestsResponse();

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const { rows } = await auth.db.query(
      `SELECT id, user_id, name, target_amount, current_amount, locked, status, created_at
       FROM savings_goals
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [auth.user.id],
    );

    return NextResponse.json({ ok: true, goals: rows });
  } catch (error) {
    return errorResponse(error, "Unable to load savings goals.");
  }
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (await isRateLimited(`savings-post-ip:${clientIp}`, 100, 15 * 60_000)) return tooManyRequestsResponse();

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;
    if (await isRateLimited(`savings-post-user:${auth.user.id}`, 50, 60 * 60_000)) return tooManyRequestsResponse();

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "").trim().toLowerCase();

    if (action === "create") {
      const name = String(body.name || "").trim();
      const targetAmount = readPositiveAmount(body.targetAmount, "Target amount");
      const locked = body.locked !== false;

      if (name.length < 2 || name.length > 80) {
        throw new Error("Goal name must be between 2 and 80 characters.");
      }

      const { rows } = await auth.db.query(
        `INSERT INTO savings_goals (user_id, name, target_amount, current_amount, locked, status, created_at, updated_at)
         VALUES ($1, $2, $3, 0, $4, 'active', NOW(), NOW())
         RETURNING *`,
        [auth.user.id, name, targetAmount, locked],
      );

      return NextResponse.json({ ok: true, goal: rows[0] });
    }

    const goalId = String(body.goalId || "").trim();
    if (!goalId) throw new Error("Savings goal is required.");

    if (action === "fund") {
      const amount = readPositiveAmount(body.amount, "Savings amount");
      const userId = auth.user.id;

      const goal = await withUserTransaction(userId, async (client) => {
        await assertWalletNotFrozen(userId, client);

        // Lock the goal row to prevent races
        const { rows: goalRows } = await client.query(
          `SELECT * FROM savings_goals WHERE id = $1 AND user_id = $2 FOR UPDATE`,
          [goalId, userId],
        );
        if (!goalRows[0]) throw new Error("Savings goal not found.");
        const goal = goalRows[0];
        if (goal.status !== "active") throw new Error("Only active savings goals can be funded.");

        // Deduct from wallet (atomic with balance check)
        const { rows: walletRows } = await client.query(
          `UPDATE wallets
           SET balance = balance - $1, locked = locked + $1, updated_at = NOW()
           WHERE user_id = $2 AND balance >= $1
           RETURNING balance, locked`,
          [amount, userId],
        );
        if (!walletRows[0]) throw new Error("Insufficient wallet balance for this savings goal.");

        // Update goal
        const nextAmount = Number(goal.current_amount) + amount;
        const nextStatus = nextAmount >= Number(goal.target_amount) ? "completed" : "active";
        const { rows: updatedRows } = await client.query(
          `UPDATE savings_goals
           SET current_amount = $1, status = $2, updated_at = NOW()
           WHERE id = $3 AND user_id = $4
           RETURNING *`,
          [nextAmount, nextStatus, goalId, userId],
        );

        await client.query(
          `INSERT INTO transactions (user_id, type, amount, description, created_at)
           VALUES ($1, 'investment', $2, $3, NOW())`,
          [userId, amount, `Saved toward ${goal.name}`],
        );

        return updatedRows[0];
      });

      return NextResponse.json({ ok: true, goal });
    }

    if (action === "withdraw") {
      const userId = auth.user.id;

      const goal = await withUserTransaction(userId, async (client) => {
        await assertWalletNotFrozen(userId, client);

        const { rows: goalRows } = await client.query(
          `SELECT * FROM savings_goals WHERE id = $1 AND user_id = $2 FOR UPDATE`,
          [goalId, userId],
        );
        if (!goalRows[0]) throw new Error("Savings goal not found.");
        const goal = goalRows[0];

        const amount = Number(goal.current_amount);
        if (amount <= 0) throw new Error("This savings goal has no balance to withdraw.");
        if (goal.locked && goal.status !== "completed") {
          throw new Error("Locked goals can be withdrawn after the target is reached.");
        }

        await client.query(
          `UPDATE wallets
           SET balance = balance + $1,
               locked  = GREATEST(0, locked - $1),
               updated_at = NOW()
           WHERE user_id = $2`,
          [amount, userId],
        );

        const { rows: updatedRows } = await client.query(
          `UPDATE savings_goals
           SET current_amount = 0, status = 'withdrawn', updated_at = NOW()
           WHERE id = $1 AND user_id = $2
           RETURNING *`,
          [goalId, userId],
        );

        await client.query(
          `INSERT INTO transactions (user_id, type, amount, description, created_at)
           VALUES ($1, 'deposit', $2, $3, NOW())`,
          [userId, amount, `Released savings from ${goal.name}`],
        );

        return updatedRows[0];
      });

      return NextResponse.json({ ok: true, goal });
    }

    throw new Error("Unsupported savings action.");
  } catch (error) {
    return errorResponse(error, "Unable to update savings.");
  }
}
