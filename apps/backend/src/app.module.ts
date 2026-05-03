import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';
import { AuthModule } from './modules/auth/auth.module';
import { CourtsModule } from './modules/courts/courts.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { HealthModule } from './modules/health/health.module';
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
import { RedisModule } from './common/redis/redis.module';
import { winstonConfig } from './config/winston.config';

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
        entities: [UserEntity, CourtEntity, CourtTimeSlotEntity, BookingEntity, RefreshTokenEntity],
        synchronize: false,
      }),
    }),
    RedisModule,
    AuthModule,
    CourtsModule,
    BookingsModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
