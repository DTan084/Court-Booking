import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

export type GoogleAuthProfile = {
  provider: 'google';
  providerUserId: string;
  email?: string;
  emailVerified: boolean;
  name: string;
  avatarUrl?: string;
};

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID') || '';
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET') || '';
    const callbackURL =
      configService.get<string>('GOOGLE_CALLBACK_URL') ||
      'http://localhost:3001/api/v1/auth/oauth/google/callback';

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['profile', 'email'],
      state: true,
      session: false,
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const emailItem = profile.emails?.find((item) => Boolean(item.value));
    const payload: GoogleAuthProfile = {
      provider: 'google',
      providerUserId: profile.id,
      email: emailItem?.value?.toLowerCase().trim(),
      emailVerified: Boolean(
        (profile as Profile & { _json?: { email_verified?: boolean } })._json?.email_verified,
      ),
      name: profile.displayName || 'Google User',
      avatarUrl: profile.photos?.[0]?.value,
    };
    done(null, payload);
  }
}
