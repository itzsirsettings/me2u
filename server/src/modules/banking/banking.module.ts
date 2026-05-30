import { Module } from "@nestjs/common";
import { SupabaseService } from "../../common/supabase.service";
import { BankingService } from "./banking.service";
import { WemaProvider } from "./wema.provider";

@Module({
  providers: [BankingService, WemaProvider, SupabaseService],
  exports: [BankingService, WemaProvider],
})
export class BankingModule {}
