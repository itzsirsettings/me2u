import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  errorResponse,
  readPositiveAmount,
  requireAuthenticatedUser,
  tooManyRequestsResponse,
} from "@/lib/server/auth";

async function assertWalletNotFrozen(db: any, userId: string) {
  const { data, error } = await db
    .from("user_security_settings")
    .select("wallet_frozen")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (data?.wallet_frozen) {
    throw new Error("Your wallet is frozen. Unfreeze it from Security Center before moving savings.");
  }
}

export async function GET(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(`savings-get-ip:${clientIp}`, 30, 60_000)) return tooManyRequestsResponse();

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const { data, error } = await auth.supabase
      .from("savings_goals")
      .select("*")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, goals: data || [] });
  } catch (error) {
    return errorResponse(error, "Unable to load savings goals.");
  }
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(`savings-post-ip:${clientIp}`, 30, 60_000)) return tooManyRequestsResponse();

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;
    if (isRateLimited(`savings-post-user:${auth.user.id}`, 15, 60_000)) return tooManyRequestsResponse();

    const db = auth.supabase as any;
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "").trim().toLowerCase();

    if (action === "create") {
      const name = String(body.name || "").trim();
      const targetAmount = readPositiveAmount(body.targetAmount, "Target amount");
      const locked = body.locked !== false;

      if (name.length < 2 || name.length > 80) {
        throw new Error("Goal name must be between 2 and 80 characters.");
      }

      const { data: goal, error } = await db
        .from("savings_goals")
        .insert({
          user_id: auth.user.id,
          name,
          target_amount: targetAmount,
          locked,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, goal });
    }

    const goalId = String(body.goalId || "").trim();
    if (!goalId) throw new Error("Savings goal is required.");

    const { data: goal, error: goalError } = await db
      .from("savings_goals")
      .select("*")
      .eq("id", goalId)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (goalError) throw new Error(goalError.message);
    if (!goal) throw new Error("Savings goal not found.");

    if (action === "fund") {
      await assertWalletNotFrozen(db, auth.user.id);
      if (goal.status !== "active") throw new Error("Only active savings goals can be funded.");

      const amount = readPositiveAmount(body.amount, "Savings amount");
      const { data: wallet, error: walletError } = await db
        .from("wallets")
        .select("balance, locked")
        .eq("user_id", auth.user.id)
        .maybeSingle();

      if (walletError) throw new Error(walletError.message);
      if (!wallet) throw new Error("Wallet not found.");

      const balance = Number(wallet.balance || 0);
      const locked = Number(wallet.locked || 0);
      if (balance < amount) throw new Error("Insufficient wallet balance for this savings goal.");

      const { data: updatedWallet, error: updateWalletError } = await db
        .from("wallets")
        .update({ balance: balance - amount, locked: locked + amount })
        .eq("user_id", auth.user.id)
        .gte("balance", amount)
        .select("balance, locked")
        .maybeSingle();

      if (updateWalletError) throw new Error(updateWalletError.message);
      if (!updatedWallet) throw new Error("Insufficient wallet balance for this savings goal.");

      const nextAmount = Number(goal.current_amount || 0) + amount;
      const nextStatus = nextAmount >= Number(goal.target_amount || 0) ? "completed" : "active";

      const { data: updatedGoal, error: updateGoalError } = await db
        .from("savings_goals")
        .update({ current_amount: nextAmount, status: nextStatus })
        .eq("id", goal.id)
        .eq("user_id", auth.user.id)
        .select()
        .single();

      if (updateGoalError) {
        await db.from("wallets").update({ balance, locked }).eq("user_id", auth.user.id);
        throw new Error(updateGoalError.message);
      }

      await db.from("transactions").insert({
        user_id: auth.user.id,
        type: "investment",
        amount,
        description: `Saved toward ${goal.name}`,
      });

      return NextResponse.json({ ok: true, goal: updatedGoal });
    }

    if (action === "withdraw") {
      await assertWalletNotFrozen(db, auth.user.id);
      const amount = Number(goal.current_amount || 0);
      if (amount <= 0) throw new Error("This savings goal has no balance to withdraw.");
      if (goal.locked && goal.status !== "completed") {
        throw new Error("Locked goals can be withdrawn after the target is reached.");
      }

      const { data: wallet, error: walletError } = await db
        .from("wallets")
        .select("balance, locked")
        .eq("user_id", auth.user.id)
        .maybeSingle();

      if (walletError) throw new Error(walletError.message);
      if (!wallet) throw new Error("Wallet not found.");

      const { error: walletUpdateError } = await db
        .from("wallets")
        .update({
          balance: Number(wallet.balance || 0) + amount,
          locked: Math.max(0, Number(wallet.locked || 0) - amount),
        })
        .eq("user_id", auth.user.id);

      if (walletUpdateError) throw new Error(walletUpdateError.message);

      const { data: updatedGoal, error: goalUpdateError } = await db
        .from("savings_goals")
        .update({ current_amount: 0, status: "withdrawn" })
        .eq("id", goal.id)
        .eq("user_id", auth.user.id)
        .select()
        .single();

      if (goalUpdateError) throw new Error(goalUpdateError.message);

      await db.from("transactions").insert({
        user_id: auth.user.id,
        type: "deposit",
        amount,
        description: `Released savings from ${goal.name}`,
      });

      return NextResponse.json({ ok: true, goal: updatedGoal });
    }

    throw new Error("Unsupported savings action.");
  } catch (error) {
    return errorResponse(error, "Unable to update savings.");
  }
}
