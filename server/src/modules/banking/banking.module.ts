import { Module } from "@nestjs/common";
import { BankingService } from "./banking.service";
import { WemaProvider } from "./wema.provider";

@Module({
  providers: [BankingService, WemaProvider],
  exports: [BankingService, WemaProvider],
})
export class BankingModule {}
