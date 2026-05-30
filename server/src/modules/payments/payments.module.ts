import { Module } from "@nestjs/common";
import { SupabaseService } from "../../common/supabase.service";
import { BankingModule } from "../banking/banking.module";
import { PaystackService } from "./paystack.service";

@Module({
  imports: [BankingModule],
  providers: [PaystackService, SupabaseService],
  exports: [PaystackService],
})
export class PaymentsModule {}
