import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthenticatedRequestUser } from "../../common/supabase.service";

export const RequestUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<{ me2uUser?: AuthenticatedRequestUser }>();
  return request.me2uUser;
});
