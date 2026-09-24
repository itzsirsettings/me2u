import { Module } from "@nestjs/common";
import { RailwayDbService } from "../../common/railway-db.service";
import { AuthGuard } from "./auth.guard";
import { AdminGuard } from "./admin.guard";

@Module({
  providers: [RailwayDbService, AuthGuard, AdminGuard],
  exports: [RailwayDbService, AuthGuard, AdminGuard],
})
export class AuthModule {}
