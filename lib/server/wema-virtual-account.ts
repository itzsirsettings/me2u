import type { Json } from "@/lib/database/types";
import { query } from "@/lib/railway/client";

type WemaVirtualAccountParams = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  ninLast4?: string | null;
};

function wemaEnabled() {
  return (
    process.env.WEMA_ENABLED === "true" &&
    Boolean(process.env.WEMA_BASE_URL && process.env.WEMA_API_KEY)
  );
}

function wemaPath() {
  return process.env.WEMA_VIRTUAL_ACCOUNT_PATH || "/virtual-accounts";
}

async function saveVirtualAccount(
  userId: string,
  status: string,
  payload: Json,
  account?: Record<string, any> | null,
) {
  await query(
    `INSERT INTO virtual_accounts
       (user_id, provider, provider_reference, account_name, account_number,
        bank_name, bank_code, status, response_payload, request_payload, created_at, updated_at)
     VALUES ($1, 'wema', $2, $3, $4, $5, $6, $7, $8::jsonb, '{}'::jsonb, NOW(), NOW())
     ON CONFLICT (provider, user_id)
     DO UPDATE SET
       provider_reference = EXCLUDED.provider_reference,
       account_name       = EXCLUDED.account_name,
       account_number     = EXCLUDED.account_number,
       bank_name          = EXCLUDED.bank_name,
       bank_code          = EXCLUDED.bank_code,
       status             = EXCLUDED.status,
       response_payload   = EXCLUDED.response_payload,
       updated_at         = NOW()`,
    [
      userId,
      account?.reference || account?.accountReference || account?.id || null,
      account?.accountName || account?.account_name || null,
      account?.accountNumber || account?.account_number || account?.nuban || null,
      account?.bankName || account?.bank_name || "Wema Bank",
      account?.bankCode || account?.bank_code || null,
      status,
      JSON.stringify(payload),
    ],
  );
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

  const response = await fetch(
    `${process.env.WEMA_BASE_URL!.replace(/\/$/, "")}${wemaPath()}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": process.env.WEMA_API_KEY!,
        Authorization:
          process.env.WEMA_AUTHORIZATION || `Bearer ${process.env.WEMA_API_KEY}`,
        ...(process.env.WEMA_CLIENT_ID ? { "x-client-id": process.env.WEMA_CLIENT_ID } : {}),
      },
      body: JSON.stringify(requestPayload),
    },
  );

  const payload = await response.json().catch(() => ({}));
  const account = payload?.data || payload;
  const accountNumber =
    account?.accountNumber || account?.account_number || account?.nuban || null;

  if (!response.ok || payload?.status === false) {
    await saveVirtualAccount(params.userId, "unavailable", payload as Json);
    return { status: "unavailable" };
  }

  await saveVirtualAccount(
    params.userId,
    accountNumber ? "active" : "pending",
    payload as Json,
    account,
  );
  return { status: accountNumber ? "active" : "pending" };
}
