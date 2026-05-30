import { Body, Controller, Headers, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { SupabaseService } from "../../common/supabase.service";
import { PaystackService } from "../payments/paystack.service";
import { BankingService } from "../banking/banking.service";

type RawBodyRequest = Request & { rawBody?: Buffer };

@Controller("webhooks")
export class WebhooksController {
  constructor(
    private readonly paystack: PaystackService,
    private readonly supabase: SupabaseService,
    private readonly banking: BankingService,
  ) {}

  @Post("paystack")
  paystackWebhook(@Req() request: RawBodyRequest, @Headers("x-paystack-signature") signature?: string) {
    const rawBody = request.rawBody || Buffer.from(JSON.stringify(request.body || {}));
    return this.paystack.handleWebhook(rawBody, signature);
  }

  @Post("vtpass")
  async vtpassWebhook(@Body() body: Record<string, unknown>) {
    await this.supabase.admin.from("provider_webhooks").insert({
      provider: "vtpass",
      event_type: String(body.type || body.event || "callback"),
      reference: body.request_id ? String(body.request_id) : null,
      payload: body,
      processed: false,
    });
    return { ok: true };
  }

  @Post("flutterwave")
  async flutterwaveWebhook(@Body() body: Record<string, unknown>) {
    await this.supabase.admin.from("provider_webhooks").insert({
      provider: "flutterwave",
      event_type: String(body.event || body.type || "callback"),
      reference: body.tx_ref ? String(body.tx_ref) : null,
      payload: body,
      processed: false,
    });
    return { ok: true };
  }

  @Post("wema/inflow")
  async wemaInflowWebhook(@Req() request: RawBodyRequest, @Headers() headers: Record<string, string | undefined>) {
    const rawBody = request.rawBody || Buffer.from(JSON.stringify(request.body || {}));
    return this.banking.processWemaInflow(rawBody, headers);
  }
}
