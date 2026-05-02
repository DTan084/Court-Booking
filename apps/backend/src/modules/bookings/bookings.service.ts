// TODO: Bookings Service
// - createBooking trong transaction
// - Overlap check: SELECT FOR UPDATE
// - cancelBooking — ownership + business rule checks
// - getSchedule — trả về slots theo ngày

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not } from 'typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import { CourtEntity } from '../../database/entities/court.entity';
import { BookingStatus } from '@court-booking/shared';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    @InjectRepository(CourtEntity)
    private readonly courtRepository: Repository<CourtEntity>,
  ) {}

  async getCourtSchedule(courtId: string, date: string): Promise<BookingEntity[]> {
    // Verify court exists
    const court = await this.courtRepository.findOne({ where: { id: courtId } });
    if (!court) {
      throw new NotFoundException('Court not found');
    }

    // Create date range for the given day (00:00:00 to 23:59:59.999)
    // Using UTC or server local time depending on requirements, here assuming date string is parsed to local timezone or UTC
    const startDate = new Date(`${date}T00:00:00Z`);
    const endDate = new Date(`${date}T23:59:59.999Z`);

    const bookings = await this.bookingRepository.find({
      where: {
        courtId,
        startTime: Between(startDate, endDate),
        status: Not(BookingStatus.CANCELLED),
      },
      order: {
        startTime: 'ASC',
      },
      // Select only necessary fields for schedule visualization
      select: ['id', 'startTime', 'endTime', 'status'],
    });

    return bookings;
  }

  // TODO: createBooking(dto, userId)
  // TODO: cancelBooking(id, userId)
  // TODO: findMyBookings(userId, query)
}
