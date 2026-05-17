import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Inject,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserEntity } from '../../database/entities/user.entity';
import { RefreshTokenEntity } from '../../database/entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { randomUUID, createHash } from 'crypto';
import Redis from 'ioredis';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async register(registerDto: RegisterDto) {
    const { name, password } = registerDto;
    const email = registerDto.email.toLowerCase().trim();

    this.logger.debug(`Registration attempt for email: ${email}`);

    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      this.logger.warn(`Registration failed: Email already in use [${email}]`);
      throw new ConflictException('Email already in use');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = this.userRepository.create({
      name,
      email,
      passwordHash,
    });

    await this.userRepository.save(user);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.createdAt,
    };
  }

  async login(loginDto: LoginDto) {
    const email = loginDto.email.toLowerCase().trim();
    const { password } = loginDto;

    this.logger.debug(`Login attempt for email: ${email}`);

    // 1. Check if locked out
    await this.checkLockout(email);

    // 2. Fetch user with single query
    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'passwordHash', 'name', 'role', 'createdAt'],
    });

    if (!user) {
      this.logger.warn(`Login failed: User not found for email [${email}]`);
      await this.incrementFailedAttempts(email);
      throw new UnauthorizedException('Invalid email or password');
    }

    this.logger.debug(`User found for email [${email}], comparing passwords...`);

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      this.logger.warn(`Login failed: Invalid password for email [${email}]`);
      await this.incrementFailedAttempts(email);
      throw new UnauthorizedException('Invalid email or password');
    }

    this.logger.log(`Login successful for user: ${email} (${user.id})`);

    // Success - Reset failed attempts
    await this.resetFailedAttempts(email);

    const tokens = await this.generateTokens(user);

    return tokens;
  }

  private async checkLockout(email: string) {
    const lockoutKey = `lockout:${email}`;
    const isLocked = await this.redis.get(lockoutKey);
    if (isLocked) {
      throw new UnauthorizedException(
        'Account has been temporarily locked due to multiple failed login attempts. Please try again after 15 minutes.',
      );
    }
  }

  private async incrementFailedAttempts(email: string) {
    const attemptsKey = `failed_attempts:${email}`;
    const lockoutKey = `lockout:${email}`;
    const maxAttempts = 5;
    const lockoutDuration = 15 * 60; // 15 minutes

    const attempts = await this.redis.incr(attemptsKey);
    if (attempts === 1) {
      await this.redis.expire(attemptsKey, 3600); // Reset attempts after 1 hour if no more failures
    }

    if (attempts >= maxAttempts) {
      await this.redis.set(lockoutKey, 'true', 'EX', lockoutDuration);
      await this.redis.del(attemptsKey);
    }
  }

  private async resetFailedAttempts(email: string) {
    const attemptsKey = `failed_attempts:${email}`;
    await this.redis.del(attemptsKey);
  }

  async generateTokens(user: UserEntity) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const expiresIn = this.configService.get<string>('jwt.expiresIn') || '15m';

    const accessToken = this.jwtService.sign(payload);

    // Convert expiresIn to seconds for response (e.g. '15m' → 900)
    const expiresInSeconds = this.parseExpiresInToSeconds(expiresIn);

    // Generate Refresh Token (UUID) — store in DB with 7d TTL
    const refreshToken = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.storeRefreshToken(user.id, refreshToken, expiresAt);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: expiresInSeconds,
    };
  }

  async refreshTokens(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const hashedToken = createHash('sha256').update(refreshToken).digest('hex');

    const existingToken = await this.refreshTokenRepository.findOne({
      where: { token: hashedToken, revoked: false },
    });

    if (!existingToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (existingToken.expiresAt < new Date()) {
      await this.revokeRefreshToken(refreshToken);
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.userRepository.findOne({ where: { id: existingToken.userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Rotate refresh token
    await this.revokeRefreshToken(refreshToken);
    return this.generateTokens(user);
  }

  async revokeRefreshToken(refreshToken: string) {
    if (!refreshToken) return;
    const hashedToken = createHash('sha256').update(refreshToken).digest('hex');
    await this.refreshTokenRepository.update({ token: hashedToken }, { revoked: true });
  }

  private parseExpiresInToSeconds(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // default 15m
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * (multipliers[unit] ?? 1);
  }

  async storeRefreshToken(userId: string, token: string, expiresAt: Date) {
    const hashedToken = createHash('sha256').update(token).digest('hex');
    const refreshToken = this.refreshTokenRepository.create({
      userId,
      token: hashedToken,
      expiresAt,
    });

    await this.refreshTokenRepository.save(refreshToken);
  }
}
