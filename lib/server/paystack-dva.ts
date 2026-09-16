import { query } from "@/lib/railway/client";

type AssignPaystackDvaParams = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  countryCode: string;
};

type DvaAssignmentResult = {
  status: "active" | "pending" | "unavailable" | "not_configured" | "skipped";
  message: string;
  accountNumber?: string | null;
};

function preferredBank() {
  return process.env.PAYSTACK_DVA_PREFERRED_BANK || "titan-paystack";
}

function normalizeNigerianPhone(phone: string) {
  const value = phone.trim();
  if (value.startsWith("+")) return value;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) return `+234${digits.slice(1)}`;
  if (digits.length === 13 && digits.startsWith("234")) return `+${digits}`;
  return digits ? `+${digits}` : undefined;
}

function isDedicatedAccountUnavailable(message: string) {
  return /dedicated\s+nuban|reserved\s+accounts?|business\s+is\s+not\s+enabled|not\s+available\s+for\s+your\s+business|dedicated\s+account/i.test(
    message,
  );
}

async function saveDvaAssignment(
  userId: string,
  status: string,
  payload: unknown,
  account?: Record<string, unknown> | null,
) {
  await query(
    `INSERT INTO paystack_dedicated_accounts (
       user_id, customer_code, dedicated_account_id,
       account_name, account_number, bank_name, bank_slug,
       assignment_payload, status
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (user_id) DO UPDATE SET
       customer_code        = EXCLUDED.customer_code,
       dedicated_account_id = EXCLUDED.dedicated_account_id,
       account_name         = EXCLUDED.account_name,
       account_number       = EXCLUDED.account_number,
       bank_name            = EXCLUDED.bank_name,
       bank_slug            = EXCLUDED.bank_slug,
       assignment_payload   = EXCLUDED.assignment_payload,
       status               = EXCLUDED.status,
       updated_at           = NOW()`,
    [
      userId,
      (account?.customer as Record<string, unknown>)?.customer_code ?? null,
      account?.id ? String(account.id) : null,
      account?.account_name ?? null,
      account?.account_number ?? null,
      (account?.bank as Record<string, unknown>)?.name ??
        (account?.bank as Record<string, unknown>)?.bank_name ??
        null,
      (account?.bank as Record<string, unknown>)?.slug ?? null,
      JSON.stringify(payload),
      status,
    ],
  );
}

export async function assignPaystackDvaForNewUser(
  params: AssignPaystackDvaParams,
): Promise<DvaAssignmentResult> {
  if (params.countryCode !== "NG") {
    return {
      status: "skipped",
      message: "Dedicated Paystack wallet accounts are only assigned for Nigerian profiles.",
    };
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return { status: "not_configured", message: "Paystack secret key is not configured." };
  }

  const requestBody = {
    email: params.email,
    first_name: params.firstName,
    last_name: params.lastName,
    phone: normalizeNigerianPhone(params.phone),
    preferred_bank: preferredBank(),
    country: "NG",
  };

  const response = await fetch("https://api.paystack.co/dedicated_account/assign", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const payload = await response.json().catch(() => ({}));
  const message = String(payload?.message || "Paystack dedicated account assignment failed.");

  if (!response.ok || payload?.status === false) {
    const status = isDedicatedAccountUnavailable(message) ? "unavailable" : "pending";
    await saveDvaAssignment(params.userId, status, payload);
    return {
      status,
      message:
        status === "unavailable"
          ? "Automatic wallet account assignment is temporarily unavailable. Use the platform payment account and submit proof for review."
          : message,
    };
  }

  const account = payload?.data as Record<string, unknown> | null;
  if (account?.account_number) {
    await saveDvaAssignment(params.userId, "active", payload, account);
    return {
      status: "active",
      message: "Dedicated wallet account created.",
      accountNumber: account.account_number as string,
    };
  }

  await saveDvaAssignment(params.userId, "pending", payload);
  return {
    status: "pending",
    message: message || "Dedicated account assignment is in progress.",
  };
}
