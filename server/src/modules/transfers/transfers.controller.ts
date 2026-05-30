import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { RequestUser } from "../auth/request-user.decorator";
import type { AuthenticatedRequestUser } from "../../common/supabase.service";
import { TransfersService } from "./transfers.service";

@UseGuards(AuthGuard)
@Controller("transfers")
export class TransfersController {
  constructor(private readonly transfers: TransfersService) {}

  @Get()
  list(@RequestUser() user: AuthenticatedRequestUser) {
    return this.transfers.list(user);
  }

  @Post("resolve-account")
  resolveAccount() {
    return this.transfers.resolveAccount();
  }

  @Post("send")
  send(@RequestUser() user: AuthenticatedRequestUser, @Body() body: Record<string, unknown>) {
    return this.transfers.send(user, body);
  }

  @Post("requery/:reference")
  requery(@Param("reference") reference: string) {
    return this.transfers.requery(reference);
  }
}
