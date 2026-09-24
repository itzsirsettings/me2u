import { BadRequestException, Injectable } from "@nestjs/common";
import { query, withTransaction, type AuthenticatedRequestUser } from "../../common/railway-db.service";
import { BillsService } from "../bills/bills.service";
import { ProvidersService } from "../providers/providers.service";

@Injectable()
export class AdminService {
  constructor(
    private readonly bills: BillsService,
    private readonly providers: ProvidersService,
  ) {}

  async transactions() {
    const { rows } = await query(
      `SELECT bt.*,
              bp.name as "productName", bp.network,
              p.email, p.first_name, p.last_name
       FROM bill_transactions bt
       JOIN bill_products bp ON bp.id = bt.product_id
       JOIN profiles p ON p.id = bt.user_id
       ORDER BY bt.created_at DESC
       LIMIT 300`,
    );
    return rows || [];
  }

  async providerBalance() {
    const vtpass = await this.providers.primary().getBalance();
    let flutterwave: unknown = { enabled: false };
    try {
      flutterwave = await this.providers.get("flutterwave").getBalance();
    } catch (error) {
      flutterwave = { enabled: false, message: error instanceof Error ? error.message : "Disabled" };
    }
    return { vtpass, flutterwave };
  }

  requery(reference: string) {
    return this.bills.requery(reference);
  }

  async refund(admin: AuthenticatedRequestUser, reference: string) {
    const result = await this.bills.refund(reference, "Manual admin refund.");
    await query(
      `INSERT INTO admin_audit_logs (admin_user_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [admin.id, "manual_bill_refund", "bill_transaction", reference, { reference }],
    );
    return result;
  }

  async updatePricing(admin: AuthenticatedRequestUser, id: string, body: { sellingPrice?: number; commission?: number; isActive?: boolean }) {
    const patch: Record<string, unknown> = {};
    if (body.sellingPrice !== undefined) patch.selling_price = Number(body.sellingPrice);
    if (body.commission !== undefined) patch.commission = Number(body.commission);
    if (body.isActive !== undefined) patch.is_active = Boolean(body.isActive);

    const { rows } = await query(
      `UPDATE bill_products SET selling_price = COALESCE($1, selling_price), commission = COALESCE($2, commission), is_active = COALESCE($3, is_active)
       WHERE id = $4
       RETURNING *`,
      [patch.selling_price, patch.commission, patch.is_active, id],
    );

    if (rows.length === 0) throw new BadRequestException("Bill product not found.");

    await query(
      `INSERT INTO admin_audit_logs (admin_user_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [admin.id, "bill_product_pricing_update", "bill_product", id, patch],
    );

    return rows[0];
  }
}
