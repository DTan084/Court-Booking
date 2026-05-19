import { Injectable, Inject } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { Redis } from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const status = await this.redis.ping();
      const isHealthy = status === 'PONG';
      const result = this.getStatus(key, isHealthy);

      if (isHealthy) {
        return result;
      }
      throw new HealthCheckError('Redis check failed', result);
    } catch (e: any) {
      throw new HealthCheckError(
        'Redis check failed',
        this.getStatus(key, false, { message: e.message }),
      );
    }
  }
}
