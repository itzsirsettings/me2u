import { Body, Controller, Get, Headers, Param, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { RequestUser } from "../auth/request-user.decorator";
import type { AuthenticatedRequestUser } from "../../common/supabase.service";
import { BillsService } from "./bills.service";

@UseGuards(AuthGuard)
@Controller("bills")
export class BillsController {
  constructor(private readonly bills: BillsService) {}

  @Get("categories")
  categories() {
    return this.bills.categories();
  }

  @Get("products")
  products(@Query() query: { category?: string; network?: string }) {
    return this.bills.products(query);
  }

  @Post("validate-customer")
  validateCustomer(@Body() body: { productId?: string; customerIdentifier?: string }) {
    return this.bills.validateCustomer(body);
  }

  @Post("purchase")
  purchase(
    @RequestUser() user: AuthenticatedRequestUser,
    @Body() body: Record<string, unknown>,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    return this.bills.purchase(user, body, idempotencyKey);
  }

  @Get("transactions")
  transactions(@RequestUser() user: AuthenticatedRequestUser) {
    return this.bills.transactions(user);
  }

  @Get("transactions/:reference")
  transaction(@RequestUser() user: AuthenticatedRequestUser, @Param("reference") reference: string) {
    return this.bills.transaction(user, reference);
  }

  @Post("requery/:reference")
  requery(@Param("reference") reference: string) {
    return this.bills.requery(reference);
  }
}
