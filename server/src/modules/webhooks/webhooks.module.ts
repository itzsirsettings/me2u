import { Module } from "@nestjs/common";
import { SupabaseService } from "../../common/supabase.service";
import { BankingModule } from "../banking/banking.module";
import { PaymentsModule } from "../payments/payments.module";
import { WebhooksController } from "./webhooks.controller";

@Module({
  imports: [BankingModule, PaymentsModule],
  controllers: [WebhooksController],
  providers: [SupabaseService],
})
export class WebhooksModule {}
