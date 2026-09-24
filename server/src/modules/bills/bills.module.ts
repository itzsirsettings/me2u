import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { RailwayDbService } from "../../common/railway-db.service";
import { AuthModule } from "../auth/auth.module";
import { ProvidersModule } from "../providers/providers.module";
import { BillsController } from "./bills.controller";
import { BillsService } from "./bills.service";

@Module({
  imports: [
    AuthModule,
    ProvidersModule,
    BullModule.registerQueue({ name: "bill-purchase" }, { name: "bill-requery" }),
  ],
  controllers: [BillsController],
  providers: [BillsService, RailwayDbService],
  exports: [BillsService],
})
export class BillsModule {}
