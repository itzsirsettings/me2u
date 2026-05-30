import { BadRequestException, HttpException, Injectable, UnauthorizedException } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";
import { SupabaseService } from "../../common/supabase.service";

function paystackSecret() {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error("Paystack secret key is not configured.");
  return secret;
}

function safeEqualHex(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function exceptionText(error: unknown) {
  const parts: string[] = [];
  if (error instanceof Error) parts.push(error.message);
  if (error instanceof HttpException) {
    const response = error.getResponse();
    if (typeof response === "string") {
      parts.push(response);
    } else if (response && typeof response === "object") {
      const body = response as Record<string, unknown>;
      if (typeof body.message === "string") parts.push(body.message);
      if (Array.isArray(body.message)) parts.push(body.message.filter((item) => typeof item === "string").join(" "));
      if (typeof body.error === "string") parts.push(body.error);
    }
  }
  return parts.join(" ");
}

function isDedicatedAccountUnavailable(error: unknown) {
  return /dedicated\s+nuban|reserved\s+accounts?|business\s+is\s+not\s+enabled|not\s+available\s+for\s+your\s+business|dedicated\s+account/i.test(
    exceptionText(error),
  );
}

function preferredBank() {
  return process.env.PAYSTACK_DVA_PREFERRED_BANK || "titan-paystack";
}

function dedicatedAccountRow(userId: string, account: any, payload: any) {
  return {
    user_id: userId,
    customer_code: account?.customer?.customer_code || null,
    dedicated_account_id: account?.id ? String(account.id) : null,
    account_name: account?.account_name || null,
    account_number: account?.account_number || null,
    bank_name: account?.bank?.name || account?.bank?.bank_name || null,
    bank_slug: account?.bank?.slug || null,
    assignment_payload: payload,
    status: account?.active === false ? "inactive" : account?.account_number ? "active" : "pending",
  };
}

@Injectable()
export class PaystackService {
  constructor(private readonly supabase: SupabaseService) {}

  private async request(path: string, init: RequestInit = {}) {
    const response = await fetch(`https://api.paystack.co${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${paystackSecret()}`,
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.status === false) {
      throw new BadRequestException(payload?.message || "Paystack request failed.");
    }
    return payload;
  }

  private unavailableFundingAccount(message = "Dedicated wallet accounts are not available yet. Use the platform payment account and submit proof for review.") {
    return {
      status: "unavailable",
      message,
    };
  }

  verifyWebhookSignature(rawBody: Buffer, signature?: string) {
    if (!signature) throw new UnauthorizedException("Missing Paystack signature.");
    const expected = createHmac("sha512", paystackSecret()).update(rawBody).digest("hex");
    if (!safeEqualHex(expected, signature)) throw new UnauthorizedException("Invalid Paystack signature.");
  }

  async verifyTransaction(reference: string) {
    return this.request(`/transaction/verify/${encodeURIComponent(reference)}`);
  }

  private async findManagedAccountByEmail(email: string) {
    const query = new URLSearchParams({
      active: "true",
      currency: "NGN",
      provider_slug: preferredBank(),
    });
    const payload = await this.request(`/dedicated_account?${query.toString()}`);
    const normalizedEmail = email.trim().toLowerCase();
    return Array.isArray(payload?.data)
      ? payload.data.find((account: any) => String(account?.customer?.email || "").trim().toLowerCase() === normalizedEmail)
      : null;
  }

  private async saveDedicatedAccount(userId: string, account: any, payload: any) {
    const { data, error } = await this.supabase.admin
      .from("paystack_dedicated_accounts")
      .upsert(dedicatedAccountRow(userId, account, payload), { onConflict: "user_id" })
      .select("*")
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getOrCreateDedicatedAccount(userId: string) {
    const { data: existing, error: existingError } = await this.supabase.admin
      .from("paystack_dedicated_accounts")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingError) throw new BadRequestException(existingError.message);
    if (existing?.account_number) return existing;

    const { data: profile, error: profileError } = await this.supabase.admin
      .from("profiles")
      .select("first_name, last_name, email, phone, kyc_verified")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) throw new BadRequestException(profileError.message);
    if (!profile) throw new BadRequestException("Profile not found.");
    if (!profile.kyc_verified) throw new BadRequestException("Complete KYC before requesting a funding account.");

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return {
        status: "not_configured",
        message: "Paystack is not configured yet.",
      };
    }

    if (existing?.status === "pending") {
      const managedAccount = await this.findManagedAccountByEmail(profile.email);
      if (managedAccount?.account_number) {
        return this.saveDedicatedAccount(userId, managedAccount, managedAccount);
      }
      return {
        ...existing,
        message: "Dedicated account assignment is still in progress. Use the platform payment account while Paystack completes it.",
      };
    }

    let assigned: any;
    try {
      assigned = await this.request("/dedicated_account/assign", {
        method: "POST",
        body: JSON.stringify({
          email: profile.email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone || undefined,
          preferred_bank: preferredBank(),
          country: "NG",
        }),
      });
    } catch (error) {
      if (isDedicatedAccountUnavailable(error)) {
        return this.unavailableFundingAccount("Automatic wallet account assignment is temporarily unavailable. Use the platform payment account and submit proof for review.");
      }
      throw error;
    }

    if (assigned?.data?.account_number) {
      return this.saveDedicatedAccount(userId, assigned.data, assigned);
    }

    const { data, error } = await this.supabase.admin
      .from("paystack_dedicated_accounts")
      .upsert(
        {
          user_id: userId,
          assignment_payload: assigned,
          status: "pending",
        },
        { onConflict: "user_id" },
      )
      .select("*")
      .single();

    if (error) throw new BadRequestException(error.message);
    return {
      ...data,
      message: assigned?.message || "Dedicated account assignment is in progress.",
    };
  }

  async handleWebhook(rawBody: Buffer, signature?: string) {
    this.verifyWebhookSignature(rawBody, signature);
    const event = JSON.parse(rawBody.toString("utf8"));
    const reference = event?.data?.reference ? String(event.data.reference) : null;

    await this.supabase.admin.from("provider_webhooks").insert({
      provider: "paystack",
      event_type: event?.event || null,
      reference,
      payload: event,
      processed: false,
    });

    if (event?.event === "dedicatedaccount.assign.success") {
      const account = event.data;
      const email = String(account?.customer?.email || "").trim().toLowerCase();
      if (email) {
        const { data: profile } = await this.supabase.admin
          .from("profiles")
          .select("id")
          .eq("email", email)
          .maybeSingle();
        if (profile?.id) {
          await this.saveDedicatedAccount(profile.id, account, event);
        }
      }
      return { ok: true };
    }

    if (event?.event === "dedicatedaccount.assign.failed") {
      const email = String(event?.data?.customer?.email || event?.data?.email || "").trim().toLowerCase();
      if (email) {
        const { data: profile } = await this.supabase.admin
          .from("profiles")
          .select("id")
          .eq("email", email)
          .maybeSingle();
        if (profile?.id) {
          await this.supabase.admin
            .from("paystack_dedicated_accounts")
            .upsert(
              {
                user_id: profile.id,
                assignment_payload: event,
                status: "unavailable",
              },
              { onConflict: "user_id" },
            );
        }
      }
      return { ok: true };
    }

    if (event?.event !== "charge.success" || !reference) {
      return { ok: true, ignored: true };
    }

    const verified = await this.verifyTransaction(reference);
    const data = verified.data;

    if (data.status !== "success" || data.currency !== "NGN") {
      throw new BadRequestException("Paystack transaction is not a successful NGN charge.");
    }

    const accountNumber =
      data?.authorization?.receiver_bank_account_number ||
      data?.dedicated_account?.account_number ||
      data?.metadata?.receiver_account_number ||
      null;
    const customerCode = data?.customer?.customer_code || null;

    let accountQuery = this.supabase.admin.from("paystack_dedicated_accounts").select("*");
    if (accountNumber) {
      accountQuery = accountQuery.eq("account_number", accountNumber);
    } else if (customerCode) {
      accountQuery = accountQuery.eq("customer_code", customerCode);
    } else {
      throw new BadRequestException("Unable to map Paystack charge to a Me2U dedicated account.");
    }

    const { data: dedicatedAccount, error } = await accountQuery.maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!dedicatedAccount) throw new BadRequestException("Dedicated account was not found.");

    const amount = Number(data.amount || 0) / 100;
    const { error: creditError } = await this.supabase.admin.rpc("me2u_credit_wallet_funding", {
      p_user_id: dedicatedAccount.user_id,
      p_amount: amount,
      p_reference: `paystack:${reference}`,
      p_description: "Paystack dedicated account wallet funding",
    });

    if (creditError) throw new BadRequestException(creditError.message);

    await this.supabase.admin
      .from("provider_webhooks")
      .update({ processed: true })
      .eq("provider", "paystack")
      .eq("reference", reference);

    return { ok: true };
  }
}
