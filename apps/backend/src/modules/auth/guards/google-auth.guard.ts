import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { createSignedOAuthState } from '../oauth-state.util';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{ query?: { callbackUrl?: string } }>();
    const callbackUrl = req.query?.callbackUrl;
    const stateSecret =
      this.configService.get<string>('GOOGLE_OAUTH_STATE_SECRET') ||
      this.configService.get<string>('jwt.secret') ||
      'oauth-state-fallback-secret';
    const redirectPath =
      typeof callbackUrl === 'string' && callbackUrl.startsWith('/') ? callbackUrl : '/courts';
    return { state: createSignedOAuthState(redirectPath, stateSecret) };
  }
}
