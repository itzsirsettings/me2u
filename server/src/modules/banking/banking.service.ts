import { BadRequestException, Injectable } from "@nestjs/common";
import { query, type AuthenticatedRequestUser } from "../../common/railway-db.service";
import { WemaProvider } from "./wema.provider";

function fullName(profile: any) {
  return [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
}

function isMissingWemaSchema(error: { message?: string } | null | undefined) {
  return /virtual_accounts|wallet_inflows|schema cache|could not find/i.test(error?.message || "");
}

@Injectable()
export class BankingService {
  constructor(
    private readonly wema: WemaProvider,
  ) {}

  async getVirtualAccount(user: AuthenticatedRequestUser) {
    const { rows } = await query(
      `SELECT * FROM virtual_accounts WHERE user_id = $1 AND provider = 'wema'`,
      [user.id],
    );

    if (rows.length === 0) {
      return this.createVirtualAccountForUser(user.id);
    }
    return rows[0];
  }

  async createVirtualAccountForUser(userId: string) {
    const { rows } = await query<{
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      phone: string | null;
      kyc_verified: boolean | null;
    }>(
      `SELECT id, first_name, last_name, email, phone, kyc_verified FROM profiles WHERE id = $1`,
      [userId],
    );
    const profile = rows[0];

    if (!profile) throw new BadRequestException("Profile not found.");
    if (!profile.kyc_verified) {
      return this.saveVirtualAccount(userId, {
        status: "pending",
        raw: {},
        message: "Complete KYC/NIN before Wema virtual account creation.",
      });
    }

    const result = await this.wema.createVirtualAccount({
      userId,
      fullName: fullName(profile),
      firstName: profile.first_name || "",
      lastName: profile.last_name || "",
      email: profile.email || "",
      phone: profile.phone || "",
      nin: null,
    });

    return this.saveVirtualAccount(userId, result);
  }

  private async saveVirtualAccount(userId: string, result: any) {
    const row = {
      user_id: userId,
      provider: "wema",
      provider_reference: result.providerReference || null,
      account_name: result.accountName || null,
      account_number: result.accountNumber || null,
      bank_name: result.bankName || null,
      bank_code: result.bankCode || null,
      status: result.status || "pending",
      response_payload: result.raw || {},
    };

    const { rows } = await query(
      `INSERT INTO virtual_accounts (user_id, provider, provider_reference, account_name, account_number, bank_name, bank_code, status, response_payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (provider, user_id) DO UPDATE SET
         provider_reference = EXCLUDED.provider_reference,
         account_name = EXCLUDED.account_name,
         account_number = EXCLUDED.account_number,
         bank_name = EXCLUDED.bank_name,
         bank_code = EXCLUDED.bank_code,
         status = EXCLUDED.status,
         response_payload = EXCLUDED.response_payload
       RETURNING *`,
      [row.user_id, row.provider, row.provider_reference, row.account_name, row.account_number, row.bank_name, row.bank_code, row.status, row.response_payload],
    );

    return {
      ...rows[0],
      message: result.message,
    };
  }

  async processWemaInflow(rawBody: Buffer, headers: Record<string, string | undefined>) {
    const notification = this.wema.parseInflowWebhook(rawBody, headers);

    await query(
      `INSERT INTO provider_webhooks (provider, event_type, reference, payload, processed)
       VALUES ($1, $2, $3, $4, false)`,
      ["wema", "wallet_inflow", notification.providerReference, notification.raw],
    );

    const { rows: vaRows } = await query(
      `SELECT * FROM virtual_accounts WHERE provider = 'wema' AND account_number = $1`,
      [notification.accountNumber],
    );
    const virtualAccount = vaRows[0];

    if (!virtualAccount) throw new BadRequestException("Virtual account was not found.");

    const { rows: walletRows } = await query(
      `SELECT id FROM wallets WHERE user_id = $1`,
      [virtualAccount.user_id],
    );
    const wallet = walletRows[0];

    if (!wallet) throw new BadRequestException("Wallet was not found.");

    const { rows: inflowRows } = await query(
      `SELECT * FROM wallet_inflows WHERE provider = 'wema' AND provider_reference = $1`,
      [notification.providerReference],
    );
    const existingInflow = inflowRows[0];

    if (existingInflow?.status === "credited") return { ok: true, duplicate: true };

    await query(
      `INSERT INTO wallet_inflows (user_id, wallet_id, virtual_account_id, provider, provider_reference, amount, currency, status, sender_name, sender_account_number, narration, raw_payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (provider, provider_reference) DO UPDATE SET
         amount = EXCLUDED.amount,
         currency = EXCLUDED.currency,
         status = EXCLUDED.status,
         sender_name = EXCLUDED.sender_name,
         sender_account_number = EXCLUDED.sender_account_number,
         narration = EXCLUDED.narration,
         raw_payload = EXCLUDED.raw_payload`,
      [
        virtualAccount.user_id, wallet.id, virtualAccount.id,
        "wema", notification.providerReference,
        notification.amount, notification.currency, "verified",
        notification.senderName, notification.senderAccountNumber,
        notification.narration, notification.raw,
      ],
    );

    const ledgerReference = `wema:${notification.providerReference}`;
    await query(
      `SELECT * FROM me2u_credit_wallet_inflow($1, $2, $3, $4::jsonb)`,
      [virtualAccount.user_id, notification.amount, ledgerReference, JSON.stringify({ virtual_account_id: virtualAccount.id, provider_reference: notification.providerReference })],
    );

    await query(
      `UPDATE wallet_inflows SET status = 'credited', credited_at = NOW()
       WHERE provider = 'wema' AND provider_reference = $1`,
      [notification.providerReference],
    );

    await query(
      `UPDATE provider_webhooks SET processed = true
       WHERE provider = 'wema' AND reference = $1`,
      [notification.providerReference],
    );

    return { ok: true };
  }

  async requeryInflow() {
    return {
      ok: false,
      status: "not_configured",
      message: "Wema inflow requery endpoint will be enabled after Wema provides the final requery documentation.",
    };
  }
}
