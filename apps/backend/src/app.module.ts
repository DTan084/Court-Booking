import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { CourtsModule } from './modules/courts/courts.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import databaseConfig from './config/database.config';
import appConfig from './config/app.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';
import bookingConfig from './config/booking.config';
import { UserEntity } from './database/entities/user.entity';
import { CourtEntity } from './database/entities/court.entity';
import { CourtTimeSlotEntity } from './database/entities/court-time-slot.entity';
import { BookingEntity } from './database/entities/booking.entity';
import { RefreshTokenEntity } from './database/entities/refresh-token.entity';
import { NotificationEntity } from './database/entities/notification.entity';
import { CourtImageEntity } from './database/entities/court-image.entity';
import { SportTypeEntity } from './database/entities/sport-type.entity';
import { FeatureEntity } from './database/entities/feature.entity';
import { CourtFeatureEntity } from './database/entities/court-feature.entity';
import { SlotTemplateEntity } from './database/entities/slot-template.entity';
import { SlotTemplateItemEntity } from './database/entities/slot-template-item.entity';
import { SystemSettingEntity } from './database/entities/system-setting.entity';
import { PaymentProviderEntity } from './database/entities/payment-provider.entity';
import { PaymentEntity } from './database/entities/payment.entity';
import { PaymentEventEntity } from './database/entities/payment-event.entity';
import { RedisModule } from './common/redis/redis.module';
import { winstonConfig } from './config/winston.config';
import { SportTypesModule } from './modules/sport-types/sport-types.module';
import { FeaturesModule } from './modules/features/features.module';
import { SlotTemplatesModule } from './modules/slot-templates/slot-templates.module';
import { SettingsModule } from './modules/settings/settings.module';
import { PaymentsModule } from './modules/payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
      load: [appConfig, databaseConfig, jwtConfig, redisConfig, bookingConfig],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: 60000, // 60000 ms = 1 minute (NestJS Throttler v6 uses ms, not seconds)
            limit: 100, // 100 requests per minute
          },
        ],
        storage: new ThrottlerStorageRedisService({
          host: configService.get<string>('redis.host', '127.0.0.1'),
          port: configService.get<number>('redis.port', 6379),
          username: configService.get<string>('redis.username') || undefined,
          password: configService.get<string>('redis.password') || undefined,
          db: configService.get<number>('redis.db', 0),
          keyPrefix: `${configService.get<string>('redis.appKeyPrefix', 'cb:')}throttle:`,
          tls: configService.get<boolean>('redis.tlsEnabled', false) ? {} : undefined,
          connectTimeout: configService.get<number>('redis.connectTimeoutMs', 2000),
          commandTimeout: configService.get<number>('redis.commandTimeoutMs', 2000),
          enableOfflineQueue: configService.get<boolean>('redis.enableOfflineQueue', false),
          maxRetriesPerRequest: configService.get<number>('redis.maxRetriesPerRequest', 1),
        }),
      }),
    }),
    WinstonModule.forRoot(winstonConfig),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.user'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        entities: [
          UserEntity,
          CourtEntity,
          CourtTimeSlotEntity,
          BookingEntity,
          RefreshTokenEntity,
          NotificationEntity,
          CourtImageEntity,
          SportTypeEntity,
          FeatureEntity,
          CourtFeatureEntity,
          SlotTemplateEntity,
          SlotTemplateItemEntity,
          SystemSettingEntity,
          PaymentProviderEntity,
          PaymentEntity,
          PaymentEventEntity,
        ],
        synchronize: configService.get<boolean>('database.synchronize', false),
        logging: configService.get<boolean>('database.logging', false),
        maxQueryExecutionTime: configService.get<number>('database.maxQueryExecutionTime', 5000),
        // Connection pooling
        extra: {
          max: configService.get<number>('database.poolSize', 10),
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        },
      }),
    }),
    RedisModule,
    AuthModule,
    CourtsModule,
    BookingsModule,
    HealthModule,
    UsersModule,
    NotificationsModule,
    SportTypesModule,
    FeaturesModule,
    SlotTemplatesModule,
    SettingsModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
