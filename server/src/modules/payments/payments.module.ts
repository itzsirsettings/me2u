import { Module } from "@nestjs/common";
import { BankingModule } from "../banking/banking.module";
import { PaystackService } from "./paystack.service";
import { RailwayDbService } from "../../common/railway-db.service";

@Module({
  imports: [BankingModule],
  controllers: [],
  providers: [PaystackService, RailwayDbService],
  exports: [PaystackService],
})
export class PaymentsModule {}
