import { Global, Module, Injectable, Inject, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
class RedisLifecycleService implements OnApplicationShutdown {
  private readonly logger = new Logger(RedisLifecycleService.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async onApplicationShutdown(signal?: string) {
    try {
      await this.redis.quit();
      this.logger.log(`Redis connection closed${signal ? ` on ${signal}` : ''}`);
    } catch {
      this.logger.warn('Redis quit failed, forcing disconnect');
      this.redis.disconnect(false);
    }
  }
}

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('RedisModule');
        const redis = new Redis({
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          username: configService.get<string>('redis.username') || undefined,
          password: configService.get<string>('redis.password'),
          db: configService.get<number>('redis.db', 0),
          keyPrefix: configService.get<string>('redis.appKeyPrefix', 'cb:'),
          tls: configService.get<boolean>('redis.tlsEnabled', false) ? {} : undefined,
          connectTimeout: configService.get<number>('redis.connectTimeoutMs', 2000),
          commandTimeout: configService.get<number>('redis.commandTimeoutMs', 2000),
          enableOfflineQueue: configService.get<boolean>('redis.enableOfflineQueue', false),
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            logger.warn(`Redis connection retry attempt ${times}, delay: ${delay}ms`);
            return delay;
          },
          maxRetriesPerRequest: configService.get<number>('redis.maxRetriesPerRequest', 1),
        });

        redis.on('error', (err) => {
          logger.error('Redis connection error:', err);
        });

        redis.on('connect', () => {
          logger.log('Redis connected successfully');
        });

        redis.on('ready', () => {
          logger.log('Redis ready to accept commands');
        });

        redis.on('reconnecting', () => {
          logger.warn('Redis reconnecting...');
        });

        return redis;
      },
      inject: [ConfigService],
    },
    RedisLifecycleService,
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
