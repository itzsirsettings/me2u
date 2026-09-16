import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { WemaProvider } from "../banking/wema.provider";
import type { BillProvider, BillProviderResult, BillPurchaseRequest } from "./provider.interface";

@Injectable()
export class WemaBillProvider implements BillProvider {
  readonly name = "wema" as const;

  constructor(private readonly wema: WemaProvider) {}

  isEnabled() {
    return this.wema.isEnabled();
  }

  async listProducts() {
    if (!this.wema.isEnabled()) {
      return { status: "not_configured", products: [] };
    }
    return {
      status: "manual_sync_required",
      products: [],
      message: "Populate Wema bill_products after Wema provides final product catalog documentation.",
    };
  }

  async validateCustomer(params: BillPurchaseRequest): Promise<BillProviderResult> {
    if (!this.wema.isEnabled()) throw new ServiceUnavailableException("Wema/ALAT bills provider is not configured.");
    return this.wema.requery(params.reference);
  }

  async purchase(params: BillPurchaseRequest): Promise<BillProviderResult> {
    if (!this.wema.isEnabled()) throw new ServiceUnavailableException("Wema/ALAT bills provider is not configured.");
    return this.wema.buyBill({
      reference: params.reference,
      category: "bill",
      serviceId: params.serviceId,
      customerId: params.customerIdentifier,
      amount: params.amount,
      variationCode: params.variationCode,
      phone: params.phone,
    });
  }

  async requery(providerReference: string): Promise<BillProviderResult> {
    if (!this.wema.isEnabled()) throw new ServiceUnavailableException("Wema/ALAT bills provider is not configured.");
    return this.wema.requery(providerReference);
  }

  async getBalance() {
    return {
      status: this.wema.isEnabled() ? "enabled" : "not_configured",
      provider: "wema",
      message: this.wema.isEnabled()
        ? "Wema balance endpoint will be enabled after Wema provides final documentation."
        : "Wema/ALAT credentials are not configured.",
    };
  }
}
