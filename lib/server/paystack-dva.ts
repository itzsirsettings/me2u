import type { Json } from "@/lib/supabase/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

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
  payload: Json,
  account?: Record<string, any> | null,
) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("paystack_dedicated_accounts").upsert(
    {
      user_id: userId,
      customer_code: account?.customer?.customer_code || null,
      dedicated_account_id: account?.id ? String(account.id) : null,
      account_name: account?.account_name || null,
      account_number: account?.account_number || null,
      bank_name: account?.bank?.name || account?.bank?.bank_name || null,
      bank_slug: account?.bank?.slug || null,
      assignment_payload: payload,
      status,
    },
    { onConflict: "user_id" },
  );

  if (error) throw new Error(error.message);
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
    return {
      status: "not_configured",
      message: "Paystack secret key is not configured.",
    };
  }

  const body = {
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
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  const message = String(payload?.message || "Paystack dedicated account assignment failed.");

  if (!response.ok || payload?.status === false) {
    const status = isDedicatedAccountUnavailable(message) ? "unavailable" : "pending";
    await saveDvaAssignment(params.userId, status, payload as Json);
    return {
      status,
      message:
        status === "unavailable"
          ? "Automatic wallet account assignment is temporarily unavailable. Use the platform payment account and submit proof for review."
          : message,
    };
  }

  const account = payload?.data;
  if (account?.account_number) {
    await saveDvaAssignment(params.userId, "active", payload as Json, account);
    return {
      status: "active",
      message: "Dedicated wallet account created.",
      accountNumber: account.account_number,
    };
  }

  await saveDvaAssignment(params.userId, "pending", payload as Json);
  return {
    status: "pending",
    message: message || "Dedicated account assignment is in progress.",
  };
}
