import { BadRequestException, HttpException, Injectable, UnauthorizedException } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";
import { query, withTransaction, type AuthenticatedRequestUser } from "../../common/railway-db.service";

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
  async getOrCreateDedicatedAccount(user: AuthenticatedRequestUser) {
    const { rows: existingRows } = await query<{ id: string; status: string; account_number: string | null }>(
      `SELECT id, status, account_number FROM paystack_dedicated_accounts WHERE user_id = $1`,
      [user.id],
    );
    const existing = existingRows[0];

    if (existing && existing.status !== "unavailable" && existing.account_number) {
      return {
        status: existing.status,
        account_number: existing.account_number,
        bank_name: "Titan Paystack",
      };
    }

    // Create a new dedicated account
    try {
      const response = await fetch("https://api.paystack.co/dedicated_account", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecret()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer: {
            email: user.email || `${user.id}@me2u.local`,
          },
          preferred_bank: preferredBank(),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.status === false) {
        throw new BadRequestException(payload?.message || "Paystack dedicated account creation failed.");
      }

      const account = payload.data;
      const row = dedicatedAccountRow(user.id, account, { createdAt: new Date().toISOString() });

      await query(
        `INSERT INTO paystack_dedicated_accounts (user_id, customer_code, dedicated_account_id, account_name, account_number, bank_name, bank_slug, assignment_payload, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (user_id) DO UPDATE SET
           status = EXCLUDED.status,
           account_number = EXCLUDED.account_number,
           bank_name = EXCLUDED.bank_name,
           assignment_payload = EXCLUDED.assignment_payload`,
        [user.id, row.customer_code, row.dedicated_account_id, row.account_name, row.account_number, row.bank_name, row.bank_slug, row.assignment_payload, row.status],
      );

      if (isDedicatedAccountUnavailable(payload)) {
        await query(
          `UPDATE paystack_dedicated_accounts SET status = 'unavailable' WHERE user_id = $1`,
          [user.id],
        );
        return { status: "unavailable", message: "Dedicated account creation is not available for your account yet." };
      }

      return {
        status: row.status,
        account_number: row.account_number,
        bank_name: row.bank_name,
      };
    } catch (error) {
      if (isDedicatedAccountUnavailable(error)) {
        return { status: "unavailable", message: "Dedicated account creation is not available for your account yet." };
      }
      throw error;
    }
  }

  verifyWebhookSignature(rawBody: Buffer, signature?: string) {
    if (!signature) throw new UnauthorizedException("Missing Paystack signature.");
    const expected = createHmac("sha512", paystackSecret()).update(rawBody).digest("hex");
    if (!safeEqualHex(expected, signature)) throw new UnauthorizedException("Invalid Paystack signature.");
  }

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

  saveDedicatedAccount(userId: string, account: any, event: any) {
    return withTransaction(async (client) => {
      await client.query(
        `INSERT INTO paystack_dedicated_accounts (user_id, customer_code, dedicated_account_id, account_name, account_number, bank_name, bank_slug, assignment_payload, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (user_id) DO UPDATE SET
           assignment_payload = EXCLUDED.assignment_payload`,
        [
          userId,
          account?.customer?.customer_code || null,
          account?.id ? String(account.id) : null,
          account?.account_name || null,
          account?.account_number || null,
          account?.bank?.name || account?.bank?.bank_name || null,
          account?.bank?.slug || null,
          event,
          account?.active === false ? "inactive" : account?.account_number ? "active" : "pending",
        ],
      );
    });
  }

  async handleWebhook(rawBody: Buffer, signature?: string) {
    this.verifyWebhookSignature(rawBody, signature);
    const event = JSON.parse(rawBody.toString());
    const reference = event?.data?.reference ? String(event.data.reference) : null;

    await query(
      `INSERT INTO provider_webhooks (provider, event_type, reference, payload, processed)
       VALUES ($1, $2, $3, $4, false)`,
      ["paystack", event?.event || null, reference, event],
    );

    if (event?.event === "dedicatedaccount.assign.success") {
      const account = event.data;
      const email = String(account?.customer?.email || "").trim().toLowerCase();
      if (email) {
        const { rows: profileRows } = await query<{ id: string }>(
          `SELECT id FROM profiles WHERE lower(email) = $1`,
          [email],
        );
        if (profileRows.length > 0) {
          await this.saveDedicatedAccount(profileRows[0].id, account, event);
        }
      }
      return { ok: true };
    }

    if (event?.event === "dedicatedaccount.assign.failed") {
      const email = String(event?.data?.customer?.email || event?.data?.email || "").trim().toLowerCase();
      if (email) {
        const { rows: profileRows } = await query<{ id: string }>(
          `SELECT id FROM profiles WHERE lower(email) = $1`,
          [email],
        );
        if (profileRows.length > 0) {
          await query(
            `INSERT INTO paystack_dedicated_accounts (user_id, assignment_payload, status)
             VALUES ($1, $2, 'unavailable')
             ON CONFLICT (user_id) DO UPDATE SET status = 'unavailable'`,
            [profileRows[0].id, event],
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

    let accountQuery = `SELECT * FROM paystack_dedicated_accounts`;
    const conditions = [];
    if (accountNumber) {
      conditions.push(`account_number = '${accountNumber}'`);
    } else if (customerCode) {
      conditions.push(`customer_code = '${customerCode}'`);
    } else {
      throw new BadRequestException("Unable to map Paystack charge to a Me2U dedicated account.");
    }
    const dedicatedAccount = (await query<any>(`${accountQuery} WHERE ${conditions.join(" AND ")} LIMIT 1`)).rows[0];

    if (!dedicatedAccount) throw new BadRequestException("Dedicated account was not found.");

    const amount = Number(data.amount || 0) / 100;

    await withTransaction(async (client) => {
      const result = await client.query(
        `SELECT * FROM me2u_credit_wallet_funding($1, $2, $3, $4)`,
        [dedicatedAccount.user_id, amount, `paystack:${reference}`, "Paystack dedicated account wallet funding"],
      );
      if (!result.rows[0]) throw new BadRequestException("Wallet credit failed.");
    });

    await query(
      `UPDATE provider_webhooks SET processed = true WHERE provider = 'paystack' AND reference = $1`,
      [reference],
    );

    return { ok: true };
  }

  async verifyTransaction(reference: string) {
    return this.request(`/transaction/verify/${encodeURIComponent(reference)}`);
  }
}
