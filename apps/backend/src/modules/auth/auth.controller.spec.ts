import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController OAuth', () => {
  const authService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshTokens: jest.fn(),
    revokeRefreshToken: jest.fn(),
    loginWithGoogle: jest.fn(),
  } as unknown as jest.Mocked<AuthService>;

  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'app.nodeEnv') return 'development';
      if (key === 'jwt.expiresIn') return '15m';
      if (key === 'jwt.refreshExpiresIn') return '7d';
      if (key === 'app.frontendUrl') return 'http://localhost:3000';
      if (key === 'FRONTEND_OAUTH_FAILURE_URL') return 'http://localhost:3000/login';
      return undefined;
    }),
  } as unknown as ConfigService;

  const controller = new AuthController(authService, configService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to frontend success path and sets auth cookies on Google callback success', async () => {
    authService.loginWithGoogle = jest.fn().mockResolvedValue({
      user: { id: 'user-1' },
      tokens: {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      },
    } as any);

    const req = {
      query: { state: '/bookings' },
      user: {
        provider: 'google',
        providerUserId: 'google-1',
        email: 'user@test.dev',
        emailVerified: true,
        name: 'Test User',
      },
    } as any;

    const res = {
      cookie: jest.fn(),
      redirect: jest.fn(),
    } as any;

    await controller.googleOAuthCallback(req, res);

    expect(authService.loginWithGoogle).toHaveBeenCalledTimes(1);
    expect(res.cookie).toHaveBeenCalledTimes(2);
    expect(res.redirect).toHaveBeenCalledWith('http://localhost:3000/bookings');
  });

  it('redirects to fallback login error URL on callback failure', async () => {
    authService.loginWithGoogle = jest
      .fn()
      .mockRejectedValue(new UnauthorizedException('Google profile not found'));

    const req = {
      query: { state: '/courts' },
      user: undefined,
    } as any;

    const res = {
      cookie: jest.fn(),
      redirect: jest.fn(),
    } as any;

    await controller.googleOAuthCallback(req, res);

    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(
      'http://localhost:3000/login?error=google_oauth_failed',
    );
  });

  it('ignores unsafe state and redirects to default route', async () => {
    authService.loginWithGoogle = jest.fn().mockResolvedValue({
      user: { id: 'user-1' },
      tokens: {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      },
    } as any);

    const req = {
      query: { state: 'https://evil.site/phish' },
      user: {
        provider: 'google',
        providerUserId: 'google-1',
        email: 'user@test.dev',
        emailVerified: true,
        name: 'Test User',
      },
    } as any;

    const res = {
      cookie: jest.fn(),
      redirect: jest.fn(),
    } as any;

    await controller.googleOAuthCallback(req, res);

    expect(res.redirect).toHaveBeenCalledWith('http://localhost:3000/courts');
  });
});
