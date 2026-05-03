import { Injectable, ConflictException, UnauthorizedException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserEntity } from '../../database/entities/user.entity';
import { RefreshTokenEntity } from '../../database/entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';

@Injectable()
export class AuthService {
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
    const { name, email, password } = registerDto;

    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
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
    const { email, password } = loginDto;

    // 1. Check if locked out
    await this.checkLockout(email);

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      await this.incrementFailedAttempts(email);
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      await this.incrementFailedAttempts(email);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Success - Reset failed attempts
    await this.resetFailedAttempts(email);

    const tokens = await this.generateTokens(user);

    return tokens;
  }

  private async checkLockout(email: string) {
    const lockoutKey = `lockout:${email}`;
    const isLocked = await this.redis.get(lockoutKey);
    if (isLocked) {
      throw new UnauthorizedException('Account is temporarily locked. Please try again later.');
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

  private parseExpiresInToSeconds(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // default 15m
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * (multipliers[unit] ?? 1);
  }

  async storeRefreshToken(userId: string, token: string, expiresAt: Date) {
    const refreshToken = this.refreshTokenRepository.create({
      userId,
      token,
      expiresAt,
    });

    await this.refreshTokenRepository.save(refreshToken);
  }
}
