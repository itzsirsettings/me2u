import type { Json } from "@/lib/supabase/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type WemaVirtualAccountParams = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  ninLast4?: string | null;
};

function wemaEnabled() {
  return process.env.WEMA_ENABLED === "true" && Boolean(process.env.WEMA_BASE_URL && process.env.WEMA_API_KEY);
}

function wemaPath() {
  return process.env.WEMA_VIRTUAL_ACCOUNT_PATH || "/virtual-accounts";
}

async function saveVirtualAccount(userId: string, status: string, payload: Json, account?: Record<string, any> | null) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("virtual_accounts").upsert(
    {
      user_id: userId,
      provider: "wema",
      provider_reference: account?.reference || account?.accountReference || account?.id || null,
      account_name: account?.accountName || account?.account_name || null,
      account_number: account?.accountNumber || account?.account_number || account?.nuban || null,
      bank_name: account?.bankName || account?.bank_name || "Wema Bank",
      bank_code: account?.bankCode || account?.bank_code || null,
      status,
      response_payload: payload,
    },
    { onConflict: "provider,user_id" },
  );
  if (error) throw new Error(error.message);
}

export async function requestWemaVirtualAccountForKycUser(params: WemaVirtualAccountParams) {
  if (!wemaEnabled()) {
    await saveVirtualAccount(params.userId, "not_configured", {
      message: "Wema/ALAT credentials are not configured.",
    });
    return { status: "not_configured" };
  }

  const requestPayload = {
    customerReference: params.userId,
    fullName: `${params.firstName} ${params.lastName}`.trim(),
    firstName: params.firstName,
    lastName: params.lastName,
    email: params.email,
    phoneNumber: params.phone || undefined,
  };

  const response = await fetch(`${process.env.WEMA_BASE_URL!.replace(/\/$/, "")}${wemaPath()}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": process.env.WEMA_API_KEY!,
      Authorization: process.env.WEMA_AUTHORIZATION || `Bearer ${process.env.WEMA_API_KEY}`,
      ...(process.env.WEMA_CLIENT_ID ? { "x-client-id": process.env.WEMA_CLIENT_ID } : {}),
    },
    body: JSON.stringify(requestPayload),
  });

  const payload = await response.json().catch(() => ({}));
  const account = payload?.data || payload;
  const accountNumber = account?.accountNumber || account?.account_number || account?.nuban || null;

  if (!response.ok || payload?.status === false) {
    await saveVirtualAccount(params.userId, "unavailable", payload as Json);
    return { status: "unavailable" };
  }

  await saveVirtualAccount(params.userId, accountNumber ? "active" : "pending", payload as Json, account);
  return { status: accountNumber ? "active" : "pending" };
}
