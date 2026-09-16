import { Module } from "@nestjs/common";
import { BankingModule } from "../banking/banking.module";
import { AuthModule } from "../auth/auth.module";
import { SupabaseService } from "../../common/supabase.service";
import { TransfersController } from "./transfers.controller";
import { TransfersService } from "./transfers.service";

@Module({
  imports: [AuthModule, BankingModule],
  controllers: [TransfersController],
  providers: [TransfersService, SupabaseService],
})
export class TransfersModule {}
