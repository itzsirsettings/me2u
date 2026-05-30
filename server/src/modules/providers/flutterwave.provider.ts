import { Injectable } from "@nestjs/common";
import type { BillProvider, BillPurchaseRequest } from "./provider.interface";

@Injectable()
export class FlutterwaveProvider implements BillProvider {
  readonly name = "flutterwave" as const;

  private assertEnabled() {
    if (process.env.FLUTTERWAVE_BILLS_ENABLED !== "true") {
      throw new Error(
        "Flutterwave Bills is disabled until KYC, source balance funding, and server IP whitelisting are complete.",
      );
    }
    if (!process.env.FLUTTERWAVE_SECRET_KEY) {
      throw new Error("Flutterwave secret key is not configured.");
    }
  }

  async listProducts() {
    this.assertEnabled();
    return { enabled: false };
  }

  async validateCustomer(_params: BillPurchaseRequest) {
    this.assertEnabled();
    return { status: "pending" as const, providerReference: "", raw: {}, message: "Not implemented." };
  }

  async purchase(_params: BillPurchaseRequest) {
    this.assertEnabled();
    return { status: "pending" as const, providerReference: "", raw: {}, message: "Not implemented." };
  }

  async requery(providerReference: string) {
    this.assertEnabled();
    return { status: "pending" as const, providerReference, raw: {}, message: "Not implemented." };
  }

  async getBalance() {
    this.assertEnabled();
    return { enabled: false };
  }
}
