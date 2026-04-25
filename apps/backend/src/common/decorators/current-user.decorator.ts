// TODO: @CurrentUser() decorator
// - Lấy req.user từ JWT payload
// - Usage: @CurrentUser() user: JwtPayload

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
