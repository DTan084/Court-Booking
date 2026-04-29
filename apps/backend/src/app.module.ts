import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { CourtsModule } from './modules/courts/courts.module';
import databaseConfig from './config/database.config';
import appConfig from './config/app.config';
import jwtConfig from './config/jwt.config';
import { UserEntity } from './database/entities/user.entity';
import { CourtEntity } from './database/entities/court.entity';
import { BookingEntity } from './database/entities/booking.entity';
import { RefreshTokenEntity } from './database/entities/refresh-token.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
      load: [appConfig, databaseConfig, jwtConfig],
    }),
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
        entities: [UserEntity, CourtEntity, BookingEntity, RefreshTokenEntity],
        synchronize: false,
      }),
    }),
    AuthModule,
    CourtsModule,
    // TODO: BookingsModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
