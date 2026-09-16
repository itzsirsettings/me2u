import { Injectable } from "@nestjs/common";
import type { BillProvider, BillProviderResult, BillPurchaseRequest } from "./provider.interface";

function lagosTimestampPrefix() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const value = (type: string) => parts.find((part) => part.type === type)?.value || "00";
  return `${value("year")}${value("month")}${value("day")}${value("hour")}${value("minute")}`;
}

function vtpassRequestId(reference: string) {
  const numericReference = reference.replace(/\D/g, "").slice(-8).padStart(8, "0");
  return `${lagosTimestampPrefix()}${numericReference}`;
}

function mapVtpassStatus(payload: any): BillProviderResult["status"] {
  const code = String(payload?.code || payload?.content?.transactions?.status || "").toLowerCase();
  const responseDescription = String(payload?.response_description || payload?.message || "").toLowerCase();

  if (code === "000" || responseDescription.includes("success")) return "successful";
  if (code === "099" || responseDescription.includes("pending") || responseDescription.includes("processing")) {
    return "pending";
  }
  if (responseDescription.includes("reverse")) return "reversed";
  return "failed";
}

@Injectable()
export class VtpassProvider implements BillProvider {
  readonly name = "vtpass" as const;
  private readonly baseUrl = process.env.VTPASS_BASE_URL || "https://sandbox.vtpass.com/api";

  private headers(method = "GET"): Record<string, string> {
    const apiKey = process.env.VTPASS_API_KEY;
    const publicKey = process.env.VTPASS_PUBLIC_KEY;
    const secretKey = process.env.VTPASS_SECRET_KEY;
    const normalizedMethod = method.toUpperCase();

    if (!apiKey || (normalizedMethod === "GET" ? !publicKey : !secretKey)) {
      throw new Error("VTpass credentials are not configured.");
    }

    return {
      "Content-Type": "application/json",
      "api-key": apiKey,
      ...(normalizedMethod === "GET" ? { "public-key": publicKey! } : { "secret-key": secretKey! }),
    };
  }

  private async request(path: string, init: RequestInit = {}) {
    const method = init.method || "GET";
    const headers = new Headers(init.headers);
    Object.entries(this.headers(method)).forEach(([key, value]) => headers.set(key, value));

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });
    const payload = await response.json().catch(() => ({}));
    return { response, payload };
  }

  async listProducts(serviceId: string) {
    const { payload } = await this.request(`/service-variations?serviceID=${encodeURIComponent(serviceId)}`);
    return payload;
  }

  async validateCustomer(params: BillPurchaseRequest) {
    const requestId = vtpassRequestId(params.reference);
    const { payload } = await this.request("/merchant-verify", {
      method: "POST",
      body: JSON.stringify({
        request_id: requestId,
        serviceID: params.serviceId,
        billersCode: params.customerIdentifier,
        type: params.variationCode || undefined,
      }),
    });

    return {
      status: mapVtpassStatus(payload),
      providerReference: requestId,
      raw: payload,
      message: payload?.response_description || payload?.message,
    };
  }

  async purchase(params: BillPurchaseRequest) {
    const requestId = vtpassRequestId(params.reference);
    const { payload } = await this.request("/pay", {
      method: "POST",
      body: JSON.stringify({
        request_id: requestId,
        serviceID: params.serviceId,
        billersCode: params.customerIdentifier,
        variation_code: params.variationCode || undefined,
        amount: params.amount,
        phone: params.phone || params.customerIdentifier,
      }),
    });

    return {
      status: mapVtpassStatus(payload),
      providerReference: requestId,
      raw: payload,
      message: payload?.response_description || payload?.message,
    };
  }

  async requery(providerReference: string) {
    const { payload } = await this.request("/requery", {
      method: "POST",
      body: JSON.stringify({ request_id: providerReference }),
    });

    return {
      status: mapVtpassStatus(payload),
      providerReference,
      raw: payload,
      message: payload?.response_description || payload?.message,
    };
  }

  async getBalance() {
    const { payload } = await this.request("/balance");
    return payload;
  }
}
