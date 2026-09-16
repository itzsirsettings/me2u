import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import { SupabaseService, type AuthenticatedRequestUser } from "../../common/supabase.service";
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
  if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException("Amount must be greater than zero.");
  if (amount > 250_000) throw new BadRequestException("Bill amount is above the allowed limit.");
  return amount;
}

function transactionReference() {
  return `M2UB${Date.now()}${Math.floor(Math.random() * 100_000).toString().padStart(5, "0")}`;
}

@Injectable()
export class BillsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly providers: ProvidersService,
    @InjectQueue("bill-purchase") private readonly purchaseQueue: Queue,
    @InjectQueue("bill-requery") private readonly requeryQueue: Queue,
  ) {}

  async categories() {
    const { data, error } = await this.supabase.admin
      .from("bill_categories")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async products(query: { category?: string; network?: string }) {
    let request = this.supabase.admin
      .from("bill_products")
      .select("*, category:bill_categories(slug, name)")
      .eq("is_active", true)
      .order("network", { ascending: true })
      .order("selling_price", { ascending: true });

    if (query.network) request = request.ilike("network", query.network);

    const { data, error } = await request;
    if (error) throw new BadRequestException(error.message);

    return (data || []).filter((product: any) => {
      if (!query.category) return true;
      return product.category?.slug === query.category;
    });
  }

  async transactions(user: AuthenticatedRequestUser) {
    const { data, error } = await this.supabase.admin
      .from("bill_transactions")
      .select("*, product:bill_products(name, network)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async transaction(user: AuthenticatedRequestUser, reference: string) {
    const { data, error } = await this.supabase.admin
      .from("bill_transactions")
      .select("*, product:bill_products(name, network)")
      .eq("user_id", user.id)
      .eq("reference", reference)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new BadRequestException("Bill transaction not found.");
    return data;
  }

  async validateCustomer(body: { productId?: string; customerIdentifier?: string }) {
    const product = await this.loadProduct(String(body.productId || ""));
    const customerIdentifier = String(body.customerIdentifier || "").trim();
    if (!customerIdentifier) throw new BadRequestException("Customer identifier is required.");

    if (["airtime", "data"].includes(product.category.slug)) {
      return { ok: true, customer: { identifier: customerIdentifier }, message: "Customer validation is not required for airtime/data." };
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

  async purchase(user: AuthenticatedRequestUser, body: PurchaseBody, idempotencyHeader?: string) {
    const product = await this.loadProduct(String(body.productId || ""));
    const amount = Number(product.selling_price || 0) > 0 ? Number(product.selling_price) : readAmount(body.amount);
    const customerIdentifier = String(body.customerIdentifier || "").trim();
    const pin = String(body.pin || "").trim();

    if (!customerIdentifier) throw new BadRequestException("Customer identifier is required.");
    if (["airtime", "data"].includes(product.category.slug) && !/^(?:\+?234|0)?[789][01]\d{8}$/.test(customerIdentifier.replace(/\s+/g, ""))) {
      throw new BadRequestException("Enter a valid Nigerian phone number.");
    }

    const { data: profile, error: profileError } = await this.supabase.admin
      .from("profiles")
      .select("kyc_verified, transaction_pin")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) throw new BadRequestException(profileError.message);
    if (!profile?.kyc_verified) throw new BadRequestException("Complete KYC before paying bills.");
    if (!profile.transaction_pin) throw new BadRequestException("Please set a transaction PIN first.");
    if (!verifyTransactionPin(profile.transaction_pin, user.id, pin)) throw new BadRequestException("Incorrect transaction PIN.");

    const { data: security, error: securityError } = await this.supabase.admin
      .from("user_security_settings")
      .select("wallet_frozen")
      .eq("user_id", user.id)
      .maybeSingle();

    if (securityError) throw new BadRequestException(securityError.message);
    if (security?.wallet_frozen) throw new BadRequestException("Your wallet is frozen.");

    const reference = transactionReference();
    const idempotencyKey = String(body.idempotencyKey || idempotencyHeader || "").trim() || reference;

    const { data, error } = await this.supabase.admin.rpc("me2u_create_bill_debit", {
      p_user_id: user.id,
      p_product_id: product.id,
      p_reference: reference,
      p_idempotency_key: idempotencyKey,
      p_amount: amount,
      p_customer_identifier: customerIdentifier,
    });

    if (error) throw new BadRequestException(error.message);

    await this.purchaseQueue.add(
      "fulfill",
      { reference: data.reference },
      { jobId: data.reference, attempts: 3, backoff: { type: "exponential", delay: 10_000 } },
    );

    return data;
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

    await this.logProvider(bill.provider, "purchase", bill.reference, result.raw, result.providerReference);

    const status = result.status === "reversed" ? "failed" : result.status;
    const { error } = await this.supabase.admin
      .from("bill_transactions")
      .update({
        status,
        provider_reference: result.providerReference,
        provider_response: result.raw as any,
        failure_reason: status === "failed" ? result.message || "Provider failed transaction." : null,
        completed_at: status === "successful" ? new Date().toISOString() : null,
        next_requery_at: status === "pending" ? new Date(Date.now() + 5 * 60_000).toISOString() : null,
      })
      .eq("reference", reference);

    if (error) throw new BadRequestException(error.message);
    if (status === "failed") await this.refund(reference, result.message || "Provider failed transaction.");
    return this.loadBill(reference);
  }

  async requery(reference: string) {
    await this.requeryQueue.add("requery", { reference }, { jobId: `requery:${reference}:${Date.now()}` });
    return { ok: true };
  }

  async requeryNow(reference: string) {
    const bill = await this.loadBill(reference);
    const provider = this.providers.get(bill.provider as BillProviderName);
    const result = await provider.requery(bill.provider_reference || bill.reference);

    await this.logProvider(bill.provider, "requery", bill.reference, result.raw, result.providerReference);

    const status = result.status === "reversed" ? "failed" : result.status;
    const { error } = await this.supabase.admin
      .from("bill_transactions")
      .update({
        status,
        provider_response: result.raw as any,
        failure_reason: status === "failed" ? result.message || "Provider failed transaction." : null,
        requery_count: Number(bill.requery_count || 0) + 1,
        completed_at: status === "successful" ? new Date().toISOString() : bill.completed_at,
        next_requery_at: status === "pending" ? new Date(Date.now() + 5 * 60_000).toISOString() : null,
      })
      .eq("reference", reference);

    if (error) throw new BadRequestException(error.message);
    if (status === "failed") await this.refund(reference, result.message || "Provider failed transaction.");
    return this.loadBill(reference);
  }

  async refund(reference: string, reason = "Bill payment failed.") {
    const { data, error } = await this.supabase.admin.rpc("me2u_refund_bill_transaction", {
      p_reference: reference,
      p_reason: reason,
    });
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async requeryPendingBatch() {
    const { data, error } = await this.supabase.admin
      .from("bill_transactions")
      .select("reference")
      .eq("status", "pending")
      .lte("next_requery_at", new Date().toISOString())
      .limit(50);

    if (error) throw new ServiceUnavailableException(error.message);
    await Promise.all((data || []).map((bill: any) => this.requeryQueue.add("requery", { reference: bill.reference })));
    return { queued: data?.length || 0 };
  }

  private async loadProduct(productId: string) {
    const { data, error } = await this.supabase.admin
      .from("bill_products")
      .select("*, category:bill_categories(slug, name)")
      .eq("id", productId)
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new BadRequestException("Bill product is unavailable.");
    return data as any;
  }

  private async loadBill(reference: string) {
    const { data, error } = await this.supabase.admin
      .from("bill_transactions")
      .select("*")
      .eq("reference", reference)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new BadRequestException("Bill transaction not found.");
    return data as any;
  }

  private async logProvider(provider: string, endpoint: string, reference: string, responsePayload: unknown, providerReference?: string) {
    await this.supabase.admin.from("provider_logs").insert({
      provider,
      endpoint,
      reference,
      request_payload: { providerReference },
      response_payload: responsePayload as any,
      status_code: 200,
    });
  }
}
