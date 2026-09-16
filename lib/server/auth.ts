import { NextResponse } from "next/server";
import { getRailwayDbClient, query } from "@/lib/railway/client";
import { verifyToken, getUserById } from "@/lib/railway/auth";
import { readTokenFromRequest } from "@/lib/server/auth-cookie";
import { logApiError } from "@/lib/server/logger";
import type { User } from "@/lib/store";

const maxMoneyAmount = 10_000_000;

type AuthContext =
  | {
      db: ReturnType<typeof getRailwayDbClient>;
      user: User;
      accessToken: string;
    }
  | {
      response: NextResponse;
    };

type AdminAuthContext =
  | {
      db: ReturnType<typeof getRailwayDbClient>;
      user: User;
      accessToken: string;
    }
  | {
      response: NextResponse;
    };

export async function requireAuthenticatedUser(request: Request): Promise<AuthContext> {
  const token = readTokenFromRequest(request);

  if (!token) {
    return {
      response: NextResponse.json({ error: "Please log in first." }, { status: 401 }),
    };
  }

  const payload = verifyToken(token);
  if (!payload) {
    return {
      response: NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 }),
    };
  }

  const db = getRailwayDbClient();
  const user = await getUserById(payload.userId);

  if (!user) {
    return {
      response: NextResponse.json({ error: "User not found." }, { status: 401 }),
    };
  }

  return { db, user, accessToken: token };
}

export async function requireAdminUser(request: Request): Promise<AdminAuthContext> {
  const auth = await requireAuthenticatedUser(request);
  if ("response" in auth) return auth;

  if (auth.user.role !== "admin") {
    return {
      response: NextResponse.json({ error: "Admin access required." }, { status: 403 }),
    };
  }

  return auth;
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

export function errorResponse(error: unknown, fallback = "Unable to complete request.", route?: string) {
  if (route) logApiError(route, error);
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status: 400 });
}

export function tooManyRequestsResponse(message = "Too many attempts. Please wait and try again.") {
  return NextResponse.json({ error: message }, { status: 429 });
}