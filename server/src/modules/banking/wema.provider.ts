import { BadRequestException, Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  BankingProvider,
  BillPaymentRequest,
  InflowNotification,
  ProviderResult,
  TransferRequest,
  VirtualAccountRequest,
  VirtualAccountResult,
} from "./banking-provider.interface";

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function enabled() {
  return env("WEMA_ENABLED").toLowerCase() === "true";
}

function configured() {
  return enabled() && Boolean(env("WEMA_BASE_URL") && env("WEMA_API_KEY"));
}

function hmac(value: Buffer, secret: string) {
  return createHmac(env("WEMA_WEBHOOK_HASH") || "sha256", secret).update(value).digest("hex");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function readPath(name: string, fallback: string) {
  return env(name) || fallback;
}

function statusFromPayload(payload: any): ProviderResult["status"] {
  const status = String(payload?.status || payload?.data?.status || payload?.responseCode || payload?.code || "").toLowerCase();
  const message = String(payload?.message || payload?.responseMessage || "").toLowerCase();
  if (status === "true" || status === "success" || status === "successful" || status === "00" || message.includes("success")) return "successful";
  if (status === "pending" || status === "processing" || message.includes("pending") || message.includes("progress")) return "pending";
  if (message.includes("reverse")) return "reversed";
  return "failed";
}

@Injectable()
export class WemaProvider implements BankingProvider {
  readonly name = "wema" as const;

  isEnabled() {
    return configured();
  }

  private headers(): Record<string, string> {
    const apiKey = env("WEMA_API_KEY");
    if (!configured()) throw new ServiceUnavailableException("Wema/ALAT banking provider is not configured.");

    return {
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": apiKey,
      Authorization: env("WEMA_AUTHORIZATION") || `Bearer ${apiKey}`,
      ...(env("WEMA_CLIENT_ID") ? { "x-client-id": env("WEMA_CLIENT_ID") } : {}),
    };
  }

  private async request(path: string, init: RequestInit = {}) {
    const baseUrl = env("WEMA_BASE_URL").replace(/\/$/, "");
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        ...this.headers(),
        ...(init.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.status === false) {
      throw new BadRequestException(payload?.message || payload?.responseMessage || "Wema request failed.");
    }
    return payload;
  }

  async createVirtualAccount(payload: VirtualAccountRequest): Promise<VirtualAccountResult> {
    if (!configured()) {
      return {
        status: "not_configured",
        raw: {},
        message: "Wema/ALAT virtual account credentials are not configured.",
      };
    }

    const requestPayload = {
      customerReference: payload.userId,
      fullName: payload.fullName,
      firstName: payload.firstName,
      lastName: payload.lastName,
      phoneNumber: payload.phone,
      email: payload.email,
      nin: payload.nin || undefined,
      bvn: payload.bvn || undefined,
    };

    const raw = await this.request(readPath("WEMA_VIRTUAL_ACCOUNT_PATH", "/virtual-accounts"), {
      method: "POST",
      body: JSON.stringify(requestPayload),
    });

    const data = raw?.data || raw;
    const accountNumber = data?.accountNumber || data?.account_number || data?.nuban || null;
    return {
      status: accountNumber ? "active" : statusFromPayload(raw) === "pending" ? "pending" : "unavailable",
      providerReference: data?.reference || data?.accountReference || data?.id || null,
      accountName: data?.accountName || data?.account_name || payload.fullName,
      accountNumber,
      bankName: data?.bankName || data?.bank_name || "Wema Bank",
      bankCode: data?.bankCode || data?.bank_code || null,
      raw,
      message: raw?.message || raw?.responseMessage,
    };
  }

  parseInflowWebhook(rawBody: Buffer, headers: Record<string, string | undefined>): InflowNotification {
    const secret = env("WEMA_WEBHOOK_SECRET");
    const signatureHeader = env("WEMA_WEBHOOK_SIGNATURE_HEADER").toLowerCase() || "x-wema-signature";
    const signature =
      headers[signatureHeader] ||
      headers["x-wema-signature"] ||
      headers["x-alat-signature"] ||
      headers["x-signature"];

    if (enabled() && secret) {
      const expected = hmac(rawBody, secret);
      if (!signature || !safeEqual(expected, signature)) throw new UnauthorizedException("Invalid Wema webhook signature.");
    } else if (enabled()) {
      throw new UnauthorizedException("Wema webhook secret is not configured.");
    }

    const payload = JSON.parse(rawBody.toString("utf8") || "{}");
    const data = payload?.data || payload;
    const accountNumber = String(data?.accountNumber || data?.account_number || data?.destinationAccountNumber || "").trim();
    const amount = Number(data?.amount || data?.transactionAmount || 0);
    const providerReference = String(data?.reference || data?.transactionReference || data?.sessionId || data?.id || "").trim();

    if (!accountNumber) throw new BadRequestException("Wema webhook is missing account number.");
    if (!providerReference) throw new BadRequestException("Wema webhook is missing transaction reference.");
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException("Wema webhook has an invalid amount.");

    return {
      providerReference,
      accountNumber,
      amount,
      currency: String(data?.currency || "NGN"),
      senderName: data?.senderName || data?.originatorName || null,
      senderAccountNumber: data?.senderAccountNumber || data?.originatorAccountNumber || null,
      narration: data?.narration || data?.description || null,
      raw: payload,
    };
  }

  async buyBill(payload: BillPaymentRequest): Promise<ProviderResult> {
    const raw = await this.request(readPath("WEMA_BILLS_PAYMENT_PATH", "/bills/payment"), {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return {
      status: statusFromPayload(raw),
      providerReference: String(raw?.data?.reference || raw?.reference || payload.reference),
      raw,
      message: raw?.message || raw?.responseMessage,
    };
  }

  async transfer(payload: TransferRequest): Promise<ProviderResult> {
    const raw = await this.request(readPath("WEMA_TRANSFER_PATH", "/transfers"), {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return {
      status: statusFromPayload(raw),
      providerReference: String(raw?.data?.reference || raw?.reference || payload.reference),
      raw,
      message: raw?.message || raw?.responseMessage,
    };
  }

  async requery(reference: string): Promise<ProviderResult> {
    const raw = await this.request(`${readPath("WEMA_REQUERY_PATH", "/transactions/requery")}/${encodeURIComponent(reference)}`);
    return {
      status: statusFromPayload(raw),
      providerReference: String(raw?.data?.reference || raw?.reference || reference),
      raw,
      message: raw?.message || raw?.responseMessage,
    };
  }
}
