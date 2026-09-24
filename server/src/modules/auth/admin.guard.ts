import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { RailwayDbService, getUserFromBearer, assertAdmin, type AuthenticatedRequestUser } from "../../common/railway-db.service";

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly db: RailwayDbService) {}

  async canActivate(context: ExecutionContext) {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string>; me2uUser?: AuthenticatedRequestUser }>();

    try {
      const user = await getUserFromBearer(request.headers.authorization || "");
      await assertAdmin(user.id);
      request.me2uUser = user;
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Admin access required.";
      if (message.includes("log in") || message.includes("Session")) throw new UnauthorizedException(message);
      throw new ForbiddenException(message);
    }
  }
}
