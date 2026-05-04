import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { RefreshTokenEntity } from '../../database/entities/refresh-token.entity';

@Injectable()
export class AuthCleanupService {
  private readonly logger = new Logger(AuthCleanupService.name);

  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
  ) {}

  /**
   * Clean up expired refresh tokens daily at 2 AM
   * This prevents the refresh_tokens table from growing indefinitely
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupExpiredTokens() {
    try {
      const now = new Date();
      const result = await this.refreshTokenRepository.delete({
        expiresAt: LessThan(now),
      });

      const deletedCount = result.affected || 0;
      this.logger.log(`Cleaned up ${deletedCount} expired refresh tokens`);
    } catch (error) {
      this.logger.error('Failed to cleanup expired refresh tokens', error);
    }
  }
}
