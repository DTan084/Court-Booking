import { Module } from '@nestjs/common';
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
import { RedisModule } from './common/redis/redis.module';
import { winstonConfig } from './config/winston.config';
import { SportTypesModule } from './modules/sport-types/sport-types.module';
import { FeaturesModule } from './modules/features/features.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
      load: [appConfig, databaseConfig, jwtConfig, redisConfig, bookingConfig],
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
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
