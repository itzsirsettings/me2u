import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { RailwayDbService, getUserFromBearer } from "../../common/railway-db.service";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly db: RailwayDbService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string>; me2uUser?: unknown }>();

    try {
      request.me2uUser = await getUserFromBearer(request.headers.authorization || "");
      return true;
    } catch (error) {
      throw new UnauthorizedException(error instanceof Error ? error.message : "Please log in first.");
    }
  }
}
