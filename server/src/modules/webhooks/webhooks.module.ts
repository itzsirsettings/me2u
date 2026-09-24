import { Module } from "@nestjs/common";
import { BankingModule } from "../banking/banking.module";
import { PaymentsModule } from "../payments/payments.module";
import { WebhooksController } from "./webhooks.controller";

@Module({
  imports: [BankingModule, PaymentsModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
