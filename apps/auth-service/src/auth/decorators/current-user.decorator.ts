import { JwtPayload } from '@libs/common';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as JwtPayload;

    if (data) {
      return user?.[data];
    }
    return user;
  },
);
