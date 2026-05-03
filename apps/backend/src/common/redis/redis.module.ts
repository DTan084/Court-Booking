import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Logger } from '@nestjs/common';

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
          password: configService.get<string>('redis.password'),
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            logger.warn(`Redis connection retry attempt ${times}, delay: ${delay}ms`);
            return delay;
          },
          maxRetriesPerRequest: 3,
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
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
