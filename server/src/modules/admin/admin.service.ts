import { BadRequestException, Injectable } from "@nestjs/common";
import { SupabaseService, type AuthenticatedRequestUser } from "../../common/supabase.service";
import { BillsService } from "../bills/bills.service";
import { ProvidersService } from "../providers/providers.service";

@Injectable()
export class AdminService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly bills: BillsService,
    private readonly providers: ProvidersService,
  ) {}

  async transactions() {
    const { data, error } = await this.supabase.admin
      .from("bill_transactions")
      .select("*, product:bill_products(name, network), profile:profiles(email, first_name, last_name)")
      .order("created_at", { ascending: false })
      .limit(300);

    if (error) throw new BadRequestException(error.message);
    return data || [];
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
    await this.supabase.admin.from("admin_audit_logs").insert({
      admin_user_id: admin.id,
      action: "manual_bill_refund",
      entity_type: "bill_transaction",
      entity_id: reference,
      metadata: { reference },
    });
    return result;
  }

  async updatePricing(admin: AuthenticatedRequestUser, id: string, body: { sellingPrice?: number; commission?: number; isActive?: boolean }) {
    const patch: Record<string, unknown> = {};
    if (body.sellingPrice !== undefined) patch.selling_price = Number(body.sellingPrice);
    if (body.commission !== undefined) patch.commission = Number(body.commission);
    if (body.isActive !== undefined) patch.is_active = Boolean(body.isActive);

    const { data, error } = await this.supabase.admin
      .from("bill_products")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new BadRequestException(error.message);

    await this.supabase.admin.from("admin_audit_logs").insert({
      admin_user_id: admin.id,
      action: "bill_product_pricing_update",
      entity_type: "bill_product",
      entity_id: id,
      metadata: patch,
    });

    return data;
  }
}
