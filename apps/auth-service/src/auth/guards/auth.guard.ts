import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') implements CanActivate {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
  handleRequest<T>(err: Error | null, user: T, info: Error | null): T {
    if (info?.name === 'TokenExpiredError') {
      throw new UnauthorizedException('Token has expired');
    }

    if (info?.name === 'JsonWebTokenError') {
      throw new UnauthorizedException('Invalid token');
    }

    if (err || !user) {
      throw new UnauthorizedException('Authentication required');
    }

    return user;
  }
}
