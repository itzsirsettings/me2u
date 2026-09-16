import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../auth/admin.guard";
import { RequestUser } from "../auth/request-user.decorator";
import type { AuthenticatedRequestUser } from "../../common/supabase.service";
import { AdminService } from "./admin.service";

@UseGuards(AdminGuard)
@Controller("admin/bills")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("transactions")
  transactions() {
    return this.admin.transactions();
  }

  @Get("provider-balance")
  providerBalance() {
    return this.admin.providerBalance();
  }

  @Post("requery/:reference")
  requery(@Param("reference") reference: string) {
    return this.admin.requery(reference);
  }

  @Post("refund/:reference")
  refund(@RequestUser() user: AuthenticatedRequestUser, @Param("reference") reference: string) {
    return this.admin.refund(user, reference);
  }

  @Patch("products/:id/pricing")
  updatePricing(
    @RequestUser() user: AuthenticatedRequestUser,
    @Param("id") id: string,
    @Body() body: { sellingPrice?: number; commission?: number; isActive?: boolean },
  ) {
    return this.admin.updatePricing(user, id, body);
  }
}
