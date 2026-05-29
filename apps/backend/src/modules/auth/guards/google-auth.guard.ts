import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{ query?: { callbackUrl?: string } }>();
    const callbackUrl = req.query?.callbackUrl;
    if (typeof callbackUrl === 'string' && callbackUrl.startsWith('/')) {
      return { state: callbackUrl };
    }
    return { state: '/courts' };
  }
}
