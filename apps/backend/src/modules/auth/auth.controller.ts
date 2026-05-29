import {
  Controller,
  Post,
  Body,
  UsePipes,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Res,
  Req,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, registerSchema } from './dto/register.dto';
import { LoginDto, loginSchema } from './dto/login.dto';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from './guards/jwt.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@court-booking/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiErrorResponse } from '../../common/swagger/api-response.swagger';
import { ConfigService } from '@nestjs/config';
import {
  RegisterBody,
  RegisterResponse,
  LoginBody,
  LoginResponse,
  UserProfileResponse,
} from './swagger/auth.swagger';
import { Response, Request } from 'express';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { GoogleCallbackGuard } from './guards/google-callback.guard';
import { GoogleAuthProfile } from './strategies/google.strategy';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterBody })
  @ApiResponse({ status: 201, description: 'User registered successfully', type: RegisterResponse })
  @ApiResponse({ status: 409, description: 'Email already in use', type: ApiErrorResponse })
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(registerSchema))
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login and get tokens' })
  @ApiBody({ type: LoginBody })
  @ApiResponse({ status: 200, description: 'Login successful', type: LoginResponse })
  @ApiResponse({ status: 401, description: 'Invalid credentials', type: ApiErrorResponse })
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(loginSchema))
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.login(loginDto);
    this.setAuthCookies(res, tokens.access_token, tokens.refresh_token);
    return tokens;
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed', type: LoginResponse })
  @ApiResponse({ status: 401, description: 'Invalid refresh token', type: ApiErrorResponse })
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token;
    const tokens = await this.authService.refreshTokens(refreshToken);
    this.setAuthCookies(res, tokens.access_token, tokens.refresh_token);
    return tokens;
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token;
    await this.authService.revokeRefreshToken(refreshToken);
    this.clearAuthCookies(res);
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Current user profile', type: UserProfileResponse })
  @ApiResponse({ status: 401, description: 'Unauthorized', type: ApiErrorResponse })
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: any) {
    return user;
  }

  @Get('admin')
  @ApiOperation({ summary: 'Admin only endpoint' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Admin access granted' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only', type: ApiErrorResponse })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async adminOnly() {
    return { message: 'Welcome Admin!' };
  }

  @Get('oauth/google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Start Google OAuth flow' })
  async googleOAuthStart() {
    return;
  }

  @Get('oauth/google/callback')
  @UseGuards(GoogleCallbackGuard)
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleOAuthCallback(@Req() req: Request, @Res() res: Response) {
    const redirectState = this.resolveRedirectState(req.query?.state);
    try {
      const profile = req.user as GoogleAuthProfile | undefined;
      if (!profile) {
        throw new UnauthorizedException('Google profile not found');
      }

      const { tokens, user } = await this.authService.loginWithGoogle(profile);
      this.setAuthCookies(res, tokens.access_token, tokens.refresh_token);

      this.logger.log(
        JSON.stringify({
          event: 'oauth_callback_redirect_success',
          provider: 'google',
          userId: user.id,
          redirectPath: redirectState,
        }),
      );

      return res.redirect(this.buildSuccessRedirectUrl(redirectState));
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown_error';
      this.logger.warn(
        JSON.stringify({
          event: 'oauth_callback_reject',
          provider: 'google',
          reason,
        }),
      );
      return res.redirect(this.buildFailureRedirectUrl('google_oauth_failed'));
    }
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProduction = this.configService.get<string>('app.nodeEnv') === 'production';
    const accessExpiresIn = this.configService.get<string>('jwt.expiresIn') || '15m';
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn') || '7d';

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: this.parseExpiresInToMs(accessExpiresIn),
      path: '/',
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: this.parseExpiresInToMs(refreshExpiresIn),
      path: '/api/v1/auth/refresh',
    });
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' });
  }

  private parseExpiresInToMs(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 15 * 60 * 1000;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return value * (multipliers[unit] ?? 1);
  }

  private resolveRedirectState(state: unknown): string {
    if (typeof state === 'string' && state.startsWith('/')) {
      return state;
    }
    return '/courts';
  }

  private buildSuccessRedirectUrl(path: string): string {
    const frontendUrl =
      this.configService.get<string>('app.frontendUrl') || 'http://localhost:3000';
    return `${frontendUrl}${path}`;
  }

  private buildFailureRedirectUrl(errorCode: string): string {
    const frontendUrl =
      this.configService.get<string>('app.frontendUrl') || 'http://localhost:3000';
    const failureBase =
      this.configService.get<string>('FRONTEND_OAUTH_FAILURE_URL') || `${frontendUrl}/login`;
    const separator = failureBase.includes('?') ? '&' : '?';
    return `${failureBase}${separator}error=${encodeURIComponent(errorCode)}`;
  }
}
