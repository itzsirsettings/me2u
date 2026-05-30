import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { AuthModule } from "./modules/auth/auth.module";
import { BillsModule } from "./modules/bills/bills.module";
import { WalletModule } from "./modules/wallet/wallet.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { BankingModule } from "./modules/banking/banking.module";
import { ProvidersModule } from "./modules/providers/providers.module";
import { AdminModule } from "./modules/admin/admin.module";
import { WebhooksModule } from "./modules/webhooks/webhooks.module";
import { JobsModule } from "./modules/jobs/jobs.module";
import { TransfersModule } from "./modules/transfers/transfers.module";
import { SupabaseService } from "./common/supabase.service";

function redisConnection() {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) return { url: redisUrl };
  return {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
  };
}

@Module({
  imports: [
    BullModule.forRoot({ connection: redisConnection() }),
    AuthModule,
    ProvidersModule,
    BankingModule,
    PaymentsModule,
    BillsModule,
    WalletModule,
    TransfersModule,
    AdminModule,
    WebhooksModule,
    JobsModule,
  ],
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class AppModule {}
