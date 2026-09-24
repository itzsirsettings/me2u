import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { RailwayDbService } from "../../common/railway-db.service";
import { AuthModule } from "../auth/auth.module";
import { BillsModule } from "../bills/bills.module";
import { ProvidersModule } from "../providers/providers.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [
    AuthModule,
    ProvidersModule,
    BillsModule,
    BullModule.registerQueue({ name: "bill-purchase" }, { name: "bill-requery" }),
  ],
  controllers: [AdminController],
  providers: [AdminService, RailwayDbService],
})
export class AdminModule {}
