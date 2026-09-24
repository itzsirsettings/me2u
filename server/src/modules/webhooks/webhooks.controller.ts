import { Body, Controller, Headers, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { query } from "../../common/railway-db.service";
import { PaystackService } from "../payments/paystack.service";
import { BankingService } from "../banking/banking.service";

type RawBodyRequest = Request & { rawBody?: Buffer };

@Controller("webhooks")
export class WebhooksController {
  constructor(
    private readonly paystack: PaystackService,
    private readonly banking: BankingService,
  ) {}

  @Post("paystack")
  paystackWebhook(@Req() request: RawBodyRequest, @Headers("x-paystack-signature") signature?: string) {
    const rawBody = request.rawBody || Buffer.from(JSON.stringify(request.body || {}));
    return this.paystack.handleWebhook(rawBody, signature);
  }

  @Post("vtpass")
  async vtpassWebhook(@Body() body: Record<string, unknown>) {
    await query(
      `INSERT INTO provider_webhooks (provider, event_type, reference, payload, processed)
       VALUES ($1, $2, $3, $4, false)`,
      [
        "vtpass",
        String(body.type || body.event || "callback"),
        body.request_id ? String(body.request_id) : null,
        body,
      ],
    );
    return { ok: true };
  }

  @Post("flutterwave")
  async flutterwaveWebhook(@Body() body: Record<string, unknown>) {
    await query(
      `INSERT INTO provider_webhooks (provider, event_type, reference, payload, processed)
       VALUES ($1, $2, $3, $4, false)`,
      [
        "flutterwave",
        String(body.event || body.type || "callback"),
        body.tx_ref ? String(body.tx_ref) : null,
        body,
      ],
    );
    return { ok: true };
  }

  @Post("wema/inflow")
  async wemaInflowWebhook(@Req() request: RawBodyRequest, @Headers() headers: Record<string, string | undefined>) {
    const rawBody = request.rawBody || Buffer.from(JSON.stringify(request.body || {}));
    return this.banking.processWemaInflow(rawBody, headers);
  }
}
