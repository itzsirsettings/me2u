import { Module } from "@nestjs/common";
import { SupabaseService } from "../../common/supabase.service";
import { AuthGuard } from "./auth.guard";
import { AdminGuard } from "./admin.guard";

@Module({
  providers: [SupabaseService, AuthGuard, AdminGuard],
  exports: [SupabaseService, AuthGuard, AdminGuard],
})
export class AuthModule {}
