import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/server/auth";
import type { Database } from "@/lib/supabase/types";

type AdminAction =
  | "approve_payment_proof"
  | "reject_payment_proof"
  | "approve_withdrawal"
  | "reject_withdrawal"
  | "approve_kyc"
  | "reject_kyc";

function getUserScopedSupabase(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createClient<Database>(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

function readAction(value: unknown): AdminAction {
  if (
    value === "approve_payment_proof" ||
    value === "reject_payment_proof" ||
    value === "approve_withdrawal" ||
    value === "reject_withdrawal" ||
    value === "approve_kyc" ||
    value === "reject_kyc"
  ) {
    return value;
  }

  throw new Error("Unsupported admin action.");
}

function readId(value: unknown) {
  const id = String(value || "").trim();
  if (!id) throw new Error("Missing record id.");
  return id;
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminUser(request);
    if ("response" in auth) return auth.response;

    const body = await request.json().catch(() => ({}));
    const action = readAction(body.action);
    const id = readId(body.id);
    const supabase = getUserScopedSupabase(auth.accessToken);

    if (action === "approve_kyc" || action === "reject_kyc") {
      const { data: profile, error: profileError } = await auth.supabase
        .from("profiles")
        .select("id, bank_name, account_number, passport_photo_url")
        .eq("id", id)
        .maybeSingle();

      if (profileError) throw new Error(profileError.message);
      if (!profile) throw new Error("Profile not found.");
      if (action === "approve_kyc" && (!profile.bank_name || !profile.account_number || !profile.passport_photo_url)) {
        throw new Error("KYC documents are incomplete.");
      }

      const { error } = await auth.supabase
        .from("profiles")
        .update({ kyc_verified: action === "approve_kyc" })
        .eq("id", id);

      if (error) throw new Error(error.message);

      return NextResponse.json({ ok: true });
    }

    const { error } =
      action === "approve_payment_proof"
        ? await supabase.rpc("admin_approve_payment_proof", { p_proof_id: id })
        : action === "reject_payment_proof"
          ? await supabase.rpc("admin_reject_payment_proof", { p_proof_id: id })
          : action === "approve_withdrawal"
            ? await supabase.rpc("admin_approve_withdrawal_request", { p_request_id: id })
            : await supabase.rpc("admin_reject_withdrawal_request", { p_request_id: id });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to complete admin action.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
