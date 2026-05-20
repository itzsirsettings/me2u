import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  errorResponse,
  requireAuthenticatedUser,
  tooManyRequestsResponse,
  readPositiveAmount,
} from "@/lib/server/auth";

export async function GET(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(`circles-get-ip:${clientIp}`, 30, 60_000)) {
      return tooManyRequestsResponse();
    }

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const db = auth.supabase as any;

    // Fetch circles
    let { data: circles, error: fetchError } = await db
      .from("circles")
      .select("*")
      .order("created_at", { ascending: true });

    if (fetchError) throw new Error(fetchError.message);

    // If no circles exist, seed some default ones automatically
    if (!circles || circles.length === 0) {
      const { data: newCircle, error: insertError } = await db
        .from("circles")
        .insert({
          name: "Family Circle",
          creator_id: auth.user.id,
          pool_balance: 150000,
        })
        .select()
        .single();

      if (!insertError && newCircle) {
        await db.from("circle_members").insert({
          circle_id: newCircle.id,
          user_id: auth.user.id,
        });

        const { data: secondaryCircle, error: secInsertError } = await db
          .from("circles")
          .insert({
            name: "Co-workers Pool",
            creator_id: auth.user.id,
            pool_balance: 320000,
          })
          .select()
          .single();

        if (!secInsertError && secondaryCircle) {
          await db.from("circle_members").insert({
            circle_id: secondaryCircle.id,
            user_id: auth.user.id,
          });
        }

        // Fetch again
        const { data: reFetched } = await db
          .from("circles")
          .select("*")
          .order("created_at", { ascending: true });
        circles = reFetched || [];
      }
    }

    return NextResponse.json({ ok: true, circles });
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

    const db = auth.supabase as any;

    const body = await request.json();
    const action = String(body.action || "").trim().toLowerCase();

    if (action === "create") {
      const name = String(body.name || "").trim();
      if (!name) throw new Error("Circle name is required.");

      const { data: circle, error: createError } = await db
        .from("circles")
        .insert({
          name,
          creator_id: auth.user.id,
          pool_balance: 0,
        })
        .select()
        .single();

      if (createError) throw new Error(createError.message);

      await db.from("circle_members").insert({
        circle_id: circle.id,
        user_id: auth.user.id,
      });

      return NextResponse.json({ ok: true, circle });
    }

    if (action === "contribute") {
      const circleId = String(body.circleId || "").trim();
      const amount = readPositiveAmount(body.amount, "Contribution amount");

      if (!circleId) throw new Error("Circle ID is required.");

      // Check user wallet balance
      const { data: wallet, error: walletError } = await db
        .from("wallets")
        .select("balance")
        .eq("user_id", auth.user.id)
        .single();

      if (walletError || !wallet) throw new Error("Wallet not found.");
      if (wallet.balance < amount) {
        throw new Error("Insufficient wallet balance for contribution.");
      }

      // Check circle exists
      const { data: circle, error: circleError } = await db
        .from("circles")
        .select("pool_balance, name")
        .eq("id", circleId)
        .single();

      if (circleError || !circle) throw new Error("Circle not found.");

      // Deduct from wallet
      const newWalletBalance = wallet.balance - amount;
      const { error: walletUpdateErr } = await db
        .from("wallets")
        .update({ balance: newWalletBalance })
        .eq("user_id", auth.user.id);

      if (walletUpdateErr) throw new Error(walletUpdateErr.message);

      // Add to circle pool
      const newPoolBalance = Number(circle.pool_balance) + amount;
      const { error: circleUpdateErr } = await db
        .from("circles")
        .update({ pool_balance: newPoolBalance })
        .eq("id", circleId);

      if (circleUpdateErr) throw new Error(circleUpdateErr.message);

      // Insert transaction record
      await db.from("transactions").insert({
        user_id: auth.user.id,
        type: "investment",
        amount,
        description: `Contributed to ${circle.name} pool`,
      });

      return NextResponse.json({ ok: true, newPoolBalance });
    }

    if (action === "borrow") {
      const circleId = String(body.circleId || "").trim();
      const amount = readPositiveAmount(body.amount, "Borrow amount");

      if (!circleId) throw new Error("Circle ID is required.");

      // Check circle exists and has enough pool balance
      const { data: circle, error: circleError } = await db
        .from("circles")
        .select("pool_balance, name")
        .eq("id", circleId)
        .single();

      if (circleError || !circle) throw new Error("Circle not found.");
      if (Number(circle.pool_balance) < amount) {
        throw new Error("Insufficient funds in circle pool to fulfill this borrow request.");
      }

      // Check user wallet
      const { data: wallet, error: walletError } = await db
        .from("wallets")
        .select("balance")
        .eq("user_id", auth.user.id)
        .single();

      if (walletError || !wallet) throw new Error("Wallet not found.");

      // Deduct from circle pool
      const newPoolBalance = Number(circle.pool_balance) - amount;
      const { error: circleUpdateErr } = await db
        .from("circles")
        .update({ pool_balance: newPoolBalance })
        .eq("id", circleId);

      if (circleUpdateErr) throw new Error(circleUpdateErr.message);

      // Add to user wallet
      const newWalletBalance = wallet.balance + amount;
      const { error: walletUpdateErr } = await db
        .from("wallets")
        .update({ balance: newWalletBalance })
        .eq("user_id", auth.user.id);

      if (walletUpdateErr) throw new Error(walletUpdateErr.message);

      // Create an active loan
      const startDate = new Date().toISOString();
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
      const { error: loanErr } = await db.from("loans").insert({
        borrower_id: auth.user.id,
        amount,
        rate: 0, // 0% interest
        days: 30,
        status: "active",
        funding_source: "peer_lender",
        start_date: startDate,
        due_date: dueDate,
      });

      if (loanErr) throw new Error(loanErr.message);

      // Insert transaction record
      await db.from("transactions").insert({
        user_id: auth.user.id,
        type: "loan_disbursed",
        amount,
        description: `Borrowed from ${circle.name} pool`,
      });

      return NextResponse.json({ ok: true, newPoolBalance, newWalletBalance });
    }

    throw new Error("Invalid circle action.");
  } catch (error) {
    return errorResponse(error, "Failed to complete circle action.");
  }
}
