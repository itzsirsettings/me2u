import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import { query, withTransaction, withUserTransaction, type AuthenticatedRequestUser } from "../../common/railway-db.service";
import { verifyTransactionPin } from "../auth/pin.service";
import { ProvidersService } from "../providers/providers.service";
import type { BillProviderName } from "../providers/provider.interface";

type PurchaseBody = {
  productId?: string;
  amount?: number;
  customerIdentifier?: string;
  pin?: string;
  idempotencyKey?: string;
};

function readAmount(value: unknown) {
  const amount = Math.round(Number(value || 0) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0)
    throw new BadRequestException("Amount must be greater than zero.");
  if (amount > 250_000)
    throw new BadRequestException("Bill amount is above the allowed limit.");
  return amount;
}

function transactionReference() {
  return `M2UB${Date.now()}${Math.floor(Math.random() * 100_000).toString().padStart(5, "0")}`;
}

async function recordConvenienceFee(bill: any) {
  const selling = Number(bill?.selling_price || 0);
  const cost = Number(bill?.cost_price ?? 0);
  const margin = cost > 0 && cost <= selling ? Math.round((selling - cost) * 100) / 100 : 0;

  if (margin > 0) {
    await query(
      `INSERT INTO revenue_events (type, amount, user_id, description)
       VALUES ($1, $2, $3, $4)`,
      [
        "bills_convenience_fee",
        margin,
        bill?.user_id ?? null,
        `Bills convenience fee for ${bill?.reference} (sold ₦${selling.toFixed(2)})`,
      ],
    );
  }
}

@Injectable()
export class BillsService {
  constructor(
    private readonly providers: ProvidersService,
    @InjectQueue("bill-purchase") private readonly purchaseQueue: Queue,
    @InjectQueue("bill-requery") private readonly requeryQueue: Queue,
  ) {}

  async categories() {
    const { rows } = await query(
      `SELECT * FROM bill_categories WHERE status = 'active' ORDER BY created_at ASC`,
    );
    return rows || [];
  }

  async products(queryParam: { category?: string; network?: string }) {
    const { rows } = await query(
      `SELECT bp.*, bc.slug as "categorySlug", bc.name as "categoryName"
       FROM bill_products bp
       LEFT JOIN bill_categories bc ON bc.id = bp.category_id
       WHERE bp.is_active = true
       ORDER BY bp.network ASC, bp.selling_price ASC`,
    );

    let filtered = rows;
    if (queryParam.network) {
      filtered = filtered.filter((p: any) =>
        p.network?.toLowerCase().includes(queryParam.network!.toLowerCase())
      );
    }
    if (queryParam.category) {
      filtered = filtered.filter((p: any) => p.categorySlug === queryParam.category);
    }

    return filtered.map((p: any) => ({
      ...p,
      category: p.categorySlug ? { slug: p.categorySlug, name: p.categoryName } : null,
    }));
  }

  async transactions(user: AuthenticatedRequestUser) {
    const { rows } = await query(
      `SELECT bt.*, bp.name as "productName", bp.network
       FROM bill_transactions bt
       JOIN bill_products bp ON bp.id = bt.product_id
       WHERE bt.user_id = $1
       ORDER BY bt.created_at DESC
       LIMIT 100`,
      [user.id],
    );
    return rows || [];
  }

  async transaction(user: AuthenticatedRequestUser, reference: string) {
    const { rows } = await query(
      `SELECT bt.*, bp.name as "productName", bp.network
       FROM bill_transactions bt
       JOIN bill_products bp ON bp.id = bt.product_id
       WHERE bt.user_id = $1 AND bt.reference = $2`,
      [user.id, reference],
    );
    if (rows.length === 0) throw new BadRequestException("Bill transaction not found.");
    return rows[0];
  }

  async validateCustomer(body: { productId?: string; customerIdentifier?: string }) {
    const product = await this.loadProduct(String(body.productId || ""));
    const customerIdentifier = String(body.customerIdentifier || "").trim();
    if (!customerIdentifier) throw new BadRequestException("Customer identifier is required.");

    if (["airtime", "data"].includes(product.category.slug)) {
      return {
        ok: true,
        customer: { identifier: customerIdentifier },
        message: "Customer validation is not required for airtime/data.",
      };
    }

    const provider = this.providers.get(product.provider as BillProviderName);
    return provider.validateCustomer({
      reference: transactionReference(),
      serviceId: product.service_id,
      variationCode: product.variation_code,
      amount: Number(product.selling_price || 0),
      customerIdentifier,
    });
  }

  async purchase(
    user: AuthenticatedRequestUser,
    body: PurchaseBody,
    idempotencyHeader?: string,
  ) {
    const product = await this.loadProduct(String(body.productId || ""));
    const amount =
      Number(product.selling_price || 0) > 0
        ? Number(product.selling_price)
        : readAmount(body.amount);
    const customerIdentifier = String(body.customerIdentifier || "").trim();
    const pin = String(body.pin || "").trim();

    if (!customerIdentifier) throw new BadRequestException("Customer identifier is required.");
    if (
      ["airtime", "data"].includes(product.category.slug) &&
      !/^(?:\+?234|0)?[789][01]\d{8}$/.test(customerIdentifier.replace(/\s+/g, ""))
    ) {
      throw new BadRequestException("Enter a valid Nigerian phone number.");
    }

    const { rows: profileRows } = await query<{ kyc_verified: boolean; transaction_pin: string | null }>(
      `SELECT kyc_verified, transaction_pin FROM profiles WHERE id = $1`,
      [user.id],
    );
    const profile = profileRows[0] ?? null;

    if (!profile) throw new BadRequestException("User profile not found.");
    if (!profile.kyc_verified)
      throw new BadRequestException("Complete KYC before paying bills.");
    if (!profile.transaction_pin)
      throw new BadRequestException("Please set a transaction PIN first.");
    if (!verifyTransactionPin(profile.transaction_pin, user.id, pin))
      throw new BadRequestException("Incorrect transaction PIN.");

    const { rows: securityRows } = await query<{ wallet_frozen: boolean }>(
      `SELECT wallet_frozen FROM user_security_settings WHERE user_id = $1`,
      [user.id],
    );
    const security = securityRows[0] ?? { wallet_frozen: false };

    if (security.wallet_frozen) throw new BadRequestException("Your wallet is frozen.");

    const reference = transactionReference();
    const idempotencyKey =
      String(body.idempotencyKey || idempotencyHeader || "").trim() || reference;

    const result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM me2u_create_bill_debit($1, $2, $3, $4, $5, $6)`,
        [user.id, product.id, reference, idempotencyKey, amount, customerIdentifier],
      );
      return rows[0];
    });

    if (!result) throw new BadRequestException("Failed to create bill debit.");

    await this.purchaseQueue.add(
      "fulfill",
      { reference: result.reference },
      { jobId: result.reference, attempts: 3, backoff: { type: "exponential", delay: 10_000 } },
    );

    return result;
  }

  async fulfill(reference: string) {
    const bill = await this.loadBill(reference);
    if (["successful", "refunded"].includes(bill.status)) return bill;

    const provider = this.providers.get(bill.provider as BillProviderName);
    const result = await provider.purchase({
      reference: bill.reference,
      serviceId: bill.service_id,
      variationCode: bill.variation_code,
      amount: Number(bill.selling_price),
      customerIdentifier: bill.customer_identifier,
      phone: bill.customer_identifier,
    });

    await this.logProvider(
      bill.provider,
      "purchase",
      bill.reference,
      result.raw,
      result.providerReference,
    );

    const status = result.status === "reversed" ? "failed" : result.status;

    await query(
      `UPDATE bill_transactions SET
         status = $1,
         provider_reference = $2,
         provider_response = $3,
         failure_reason = CASE WHEN $1 = 'failed' THEN $4 ELSE NULL END,
         completed_at = CASE WHEN $1 = 'successful' THEN NOW() ELSE NULL END,
         next_requery_at = CASE WHEN $1 = 'pending' THEN NOW() + INTERVAL '5 minutes' ELSE NULL END
       WHERE reference = $5`,
      [status, result.providerReference, result.raw, result.message || "Provider failed transaction.", reference],
    );

    // Convenience fee — best-effort
    if (status === "successful") {
      try {
        await recordConvenienceFee(bill);
      } catch { /* non-critical */ }
    }

    // Schedule another requery if still pending
    if (status === "pending") {
      await this.requeryQueue.add(
        "requery",
        { reference },
        { delay: 5 * 60_000, jobId: `${reference}-requery-2` },
      );
    }

    return this.loadBill(reference);
  }

  async requery(reference: string) {
    const bill = await this.loadBill(reference);
    if (["successful", "refunded", "failed"].includes(String(bill.status))) {
      return bill;
    }

    const provider = this.providers.get(bill.provider as BillProviderName);
    const result = await provider.requery(bill.provider_reference || bill.reference);

    await this.logProvider(
      bill.provider,
      "requery",
      bill.reference,
      result.raw,
      result.providerReference,
    );

    const status = result.status === "reversed" ? "failed" : result.status;

    await query(
      `UPDATE bill_transactions SET
         status = $1,
         provider_response = $2,
         failure_reason = CASE WHEN $1 = 'failed' THEN $3 ELSE NULL END,
         completed_at = CASE WHEN $1 = 'successful' THEN NOW() ELSE NULL END,
         next_requery_at = CASE WHEN $1 = 'pending' THEN NOW() + INTERVAL '5 minutes' ELSE NULL END
       WHERE reference = $4`,
      [status, result.raw, result.message || "Provider failed transaction.", reference],
    );

    if (status === "successful" && String(bill.status) !== "successful") {
      try {
        await recordConvenienceFee(bill);
      } catch { /* non-critical */ }
    }

    if (status === "failed")
      await this.refund(reference, result.message || "Provider failed transaction.");

    return this.loadBill(reference);
  }

  async refund(reference: string, reason = "Bill payment failed.") {
    const result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM me2u_refund_bill_transaction($1, $2)`,
        [reference, reason],
      );
      return rows[0];
    });

    if (!result) throw new BadRequestException("Refund failed or transaction not found.");
    return result;
  }

  async requeryPendingBatch() {
    const { rows } = await query(
      `SELECT reference FROM bill_transactions
       WHERE status = 'pending' AND next_requery_at <= NOW()
       LIMIT 50`,
    );

    await Promise.all(
      rows.map((bill: any) =>
        this.requeryQueue.add("requery", { reference: bill.reference }),
      ),
    );
    return { queued: rows.length || 0 };
  }

  private async loadProduct(productId: string) {
    const { rows } = await query(
      `SELECT bp.*, bc.slug as "categorySlug", bc.name as "categoryName"
       FROM bill_products bp
       LEFT JOIN bill_categories bc ON bc.id = bp.category_id
       WHERE bp.id = $1 AND bp.is_active = true`,
      [productId],
    );
    if (rows.length === 0) throw new BadRequestException("Bill product is unavailable.");
    const p = rows[0];
    return {
      ...p,
      category: p.categorySlug ? { slug: p.categorySlug, name: p.categoryName } : null,
    } as any;
  }

  private async loadBill(reference: string) {
    const { rows } = await query(
      `SELECT * FROM bill_transactions WHERE reference = $1`,
      [reference],
    );
    if (rows.length === 0) throw new BadRequestException("Bill transaction not found.");
    return rows[0] as any;
  }

  private async logProvider(
    provider: string,
    endpoint: string,
    reference: string,
    responsePayload: unknown,
    providerReference?: string,
  ) {
    await query(
      `INSERT INTO provider_logs (provider, endpoint, reference, request_payload, response_payload, status_code)
       VALUES ($1, $2, $3, $4, $5, 200)`,
      [provider, endpoint, reference, { providerReference }, responsePayload],
    );
  }
}
