import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { RequestUser } from "../auth/request-user.decorator";
import type { AuthenticatedRequestUser } from "../../common/supabase.service";
import { PaystackService } from "../payments/paystack.service";
import { BankingService } from "../banking/banking.service";

@UseGuards(AuthGuard)
@Controller("wallet")
export class WalletController {
  constructor(
    private readonly paystack: PaystackService,
    private readonly banking: BankingService,
  ) {}

  @Get("funding-account")
  fundingAccount(@RequestUser() user: AuthenticatedRequestUser) {
    return this.paystack.getOrCreateDedicatedAccount(user.id);
  }

  @Post("funding-account/requery")
  requeryFundingAccount(@RequestUser() user: AuthenticatedRequestUser) {
    return this.paystack.getOrCreateDedicatedAccount(user.id);
  }

  @Get("virtual-account")
  virtualAccount(@RequestUser() user: AuthenticatedRequestUser) {
    return this.banking.getVirtualAccount(user);
  }

  @Post("requery-inflow")
  requeryInflow() {
    return this.banking.requeryInflow();
  }
}
