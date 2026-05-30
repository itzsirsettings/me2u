import { Module } from "@nestjs/common";
import { BankingModule } from "../banking/banking.module";
import { FlutterwaveProvider } from "./flutterwave.provider";
import { ProvidersService } from "./providers.service";
import { VtpassProvider } from "./vtpass.provider";
import { WemaBillProvider } from "./wema-bill.provider";

@Module({
  imports: [BankingModule],
  providers: [ProvidersService, VtpassProvider, FlutterwaveProvider, WemaBillProvider],
  exports: [ProvidersService],
})
export class ProvidersModule {}
