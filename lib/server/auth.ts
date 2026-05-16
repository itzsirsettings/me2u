import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const maxMoneyAmount = 10_000_000;

type AuthContext =
  | {
      supabase: ReturnType<typeof getSupabaseAdminClient>;
      user: User;
    }
  | {
      response: NextResponse;
    };

export async function requireAuthenticatedUser(request: Request): Promise<AuthContext> {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return {
      response: NextResponse.json({ error: "Please log in first." }, { status: 401 }),
    };
  }

  const supabase = getSupabaseAdminClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return {
      response: NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 }),
    };
  }

  return { supabase, user };
}

export function readPositiveAmount(value: unknown, label = "Amount", max = maxMoneyAmount) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }

  if (amount > max) {
    throw new Error(`${label} must not exceed ₦${max.toLocaleString()}.`);
  }

  return Math.round(amount * 100) / 100;
}

export function errorResponse(error: unknown, fallback = "Unable to complete request.") {
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status: 400 });
}

export function tooManyRequestsResponse(message = "Too many attempts. Please wait and try again.") {
  return NextResponse.json({ error: message }, { status: 429 });
}
