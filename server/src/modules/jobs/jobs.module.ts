import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { BillsModule } from "../bills/bills.module";
import { BillPurchaseProcessor } from "./bill-purchase.processor";
import { BillRequeryProcessor } from "./bill-requery.processor";
import { JobsController } from "./jobs.controller";

@Module({
  imports: [BillsModule, BullModule.registerQueue({ name: "bill-purchase" }, { name: "bill-requery" })],
  controllers: [JobsController],
  providers: [BillPurchaseProcessor, BillRequeryProcessor],
})
export class JobsModule {}
