import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => {
  const secret = process.env.JWT_SECRET;
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd && (!secret || secret === 'default-secret-change-me')) {
    throw new Error('JWT_SECRET is required and must be unique in production');
  }

  return {
    secret: secret || 'default-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  };
});
