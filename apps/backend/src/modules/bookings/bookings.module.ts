import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { BookingEntity } from '../../database/entities/booking.entity';
import { CourtEntity } from '../../database/entities/court.entity';
import { CourtTimeSlotEntity } from '../../database/entities/court-time-slot.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BookingEntity, CourtEntity, CourtTimeSlotEntity])],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
