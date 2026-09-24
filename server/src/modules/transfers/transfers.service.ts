import { BadRequestException, Injectable } from "@nestjs/common";
import { query, type AuthenticatedRequestUser } from "../../common/railway-db.service";
import { WemaProvider } from "../banking/wema.provider";

function transferReference() {
  return `M2UT${Date.now()}${Math.floor(Math.random() * 100_000).toString().padStart(5, "0")}`;
}

@Injectable()
export class TransfersService {
  constructor(
    private readonly wema: WemaProvider,
  ) {}

  async list(user: AuthenticatedRequestUser) {
    const { rows } = await query(
      `SELECT * FROM bank_transfers WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [user.id],
    );
    return rows || [];
  }

  async resolveAccount() {
    return {
      ok: false,
      status: "not_configured",
      message: "Wema account resolution will be enabled after Wema provides final transfer documentation.",
    };
  }

  async send(user: AuthenticatedRequestUser, body: Record<string, unknown>) {
    const amount = Number(body.amount || 0);
    const bankCode = String(body.bankCode || "").trim();
    const accountNumber = String(body.accountNumber || "").replace(/\D/g, "");
    const narration = String(body.narration || "Me2U transfer").trim().slice(0, 120);

    if (!this.wema.isEnabled() || process.env.WEMA_TRANSFERS_ENABLED !== "true") {
      return {
        ok: false,
        status: "not_configured",
        message: "Wema transfers are not enabled yet. Enable only after atomic transfer debit rules are finalized.",
      };
    }
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException("Amount must be greater than zero.");
    if (!bankCode || !/^\d{10}$/.test(accountNumber)) throw new BadRequestException("Enter valid bank and account details.");

    const reference = transferReference();
    const result = await this.wema.transfer({
      reference,
      amount,
      bankCode,
      accountNumber,
      narration,
    });

    const { rows: walletRows } = await query(
      `SELECT id FROM wallets WHERE user_id = $1`,
      [user.id],
    );
    const wallet = walletRows[0];

    const { rows } = await query(
      `INSERT INTO bank_transfers (user_id, wallet_id, provider, reference, provider_reference, amount, bank_code, account_number, narration, status, provider_response, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        user.id,
        wallet?.id || null,
        "wema",
        reference,
        result.providerReference,
        amount,
        bankCode,
        accountNumber,
        narration,
        result.status,
        result.raw,
        result.status === "successful" ? new Date().toISOString() : null,
      ],
    );

    return rows[0];
  }

  async requery(reference: string) {
    if (!this.wema.isEnabled() || process.env.WEMA_TRANSFERS_ENABLED !== "true") {
      return {
        ok: false,
        status: "not_configured",
        message: "Wema transfer requery is not enabled yet.",
      };
    }

    const result = await this.wema.requery(reference);

    const { rows } = await query(
      `UPDATE bank_transfers SET
         status = $1,
         provider_response = $2,
         completed_at = CASE WHEN $1 = 'successful' THEN NOW() ELSE NULL END
       WHERE reference = $3
       RETURNING *`,
      [result.status, result.raw, reference],
    );

    return rows[0] || result;
  }
}
