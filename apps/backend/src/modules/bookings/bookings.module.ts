import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BookingsController } from './bookings.controller';
import { AdminBookingsController } from './admin-bookings.controller';
import { BookingsService } from './bookings.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { BookingJobsProcessor } from './booking-jobs.processor';
import { BookingJobsScheduler } from './booking-jobs.scheduler';
import { BookingEntity } from '../../database/entities/booking.entity';
import { CourtEntity } from '../../database/entities/court.entity';
import { CourtTimeSlotEntity } from '../../database/entities/court-time-slot.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BookingEntity, CourtEntity, CourtTimeSlotEntity]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('redis.host', '127.0.0.1'),
          port: configService.get<number>('redis.port', 6379),
          password: configService.get<string>('redis.password') || undefined,
        },
      }),
    }),
    BullModule.registerQueue({ name: 'booking-jobs' }),
    NotificationsModule,
  ],
  controllers: [BookingsController, AdminBookingsController],
  providers: [BookingsService, BookingJobsProcessor, BookingJobsScheduler],
  exports: [BookingsService],
})
export class BookingsModule {}
