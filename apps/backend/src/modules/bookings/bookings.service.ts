import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { BookingEntity } from '../../database/entities/booking.entity';
import { CourtEntity, CourtStatus } from '../../database/entities/court.entity';
import { CourtTimeSlotEntity } from '../../database/entities/court-time-slot.entity';
import { BookingStatus } from '@court-booking/shared';
import { CreateBookingDto } from './dto/create-booking.dto';
import { GetMyBookingsDto } from './dto/get-my-bookings.dto';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    @InjectRepository(CourtEntity)
    private readonly courtRepository: Repository<CourtEntity>,
    @InjectRepository(CourtTimeSlotEntity)
    private readonly timeSlotRepository: Repository<CourtTimeSlotEntity>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async getCourtSchedule(courtId: string, date: string): Promise<BookingEntity[]> {
    // Optimized: Use single query with exists check instead of separate court lookup
    const startDate = new Date(`${date}T00:00:00Z`);
    const endDate = new Date(`${date}T23:59:59.999Z`);

    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .select(['booking.id', 'booking.startTime', 'booking.endTime', 'booking.status'])
      .where('booking.courtId = :courtId', { courtId })
      .andWhere('booking.startTime BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('booking.status != :cancelledStatus', { cancelledStatus: BookingStatus.CANCELLED })
      .orderBy('booking.startTime', 'ASC')
      .getMany();

    // Verify court exists only if no bookings found (optimization for common case)
    if (bookings.length === 0) {
      const courtCount = await this.courtRepository.count({ where: { id: courtId } });
      if (courtCount === 0) {
        throw new NotFoundException('Court not found');
      }
    }

    return bookings;
  }

  async createBooking(createBookingDto: CreateBookingDto, userId: string): Promise<BookingEntity> {
    const { courtId, startTime, endTime } = createBookingDto;
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start < new Date()) {
      throw new BadRequestException('Cannot book in the past');
    }

    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (durationHours <= 0) {
      throw new BadRequestException('Invalid booking duration');
    }

    // startTime/endTime must be on whole hours
    if (start.getMinutes() !== 0 || end.getMinutes() !== 0) {
      throw new BadRequestException('Booking must start and end on the hour (e.g. 08:00, 10:00)');
    }

    return this.dataSource.transaction(async (manager) => {
      // 1. Pessimistic Lock on Court
      const court = await manager.findOne(CourtEntity, {
        where: { id: courtId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!court) {
        throw new NotFoundException('Court not found');
      }

      if (court.status !== CourtStatus.ACTIVE) {
        throw new BadRequestException('Court is not active');
      }

      // 2. Validate time slots cover the requested range
      const dayOfWeek = start.getDay(); // 0=Sun, 1=Mon, ...
      const startHour = start.getHours();
      const endHour = end.getHours() || 24; // midnight = 24

      const slots = await this.timeSlotRepository.find({
        where: { courtId, dayOfWeek },
        order: { startHour: 'ASC' },
      });

      if (slots.length === 0) {
        throw new BadRequestException('Court has no available time slots for this day');
      }

      // Find consecutive slots that cover [startHour, endHour]
      const coveredSlots = this.findCoveringSlots(slots, startHour, endHour);
      if (!coveredSlots) {
        throw new BadRequestException(
          'Requested time range is not covered by available time slots',
        );
      }

      // 3. Overlap Check
      const overlappingBookings = await manager
        .createQueryBuilder(BookingEntity, 'booking')
        .where('booking.courtId = :courtId', { courtId })
        .andWhere('booking.status != :status', { status: BookingStatus.CANCELLED })
        .andWhere('booking.startTime < :endTime', { endTime: end })
        .andWhere('booking.endTime > :startTime', { startTime: start })
        .getMany();

      if (overlappingBookings.length > 0) {
        throw new ConflictException('Court is already booked for the selected time slot');
      }

      // 4. Calculate price by summing covered slots
      const totalPrice = coveredSlots.reduce((sum, slot) => sum + Number(slot.price), 0);

      // 5. Create Booking
      const booking = manager.create(BookingEntity, {
        courtId,
        userId,
        startTime: start,
        endTime: end,
        totalPrice,
        status: BookingStatus.CONFIRMED,
      });

      return manager.save(booking);
    });
  }

  /**
   * Find consecutive slots that exactly cover [startHour, endHour].
   * Returns the matching slots or null if not fully covered.
   */
  private findCoveringSlots(
    slots: CourtTimeSlotEntity[],
    startHour: number,
    endHour: number,
  ): CourtTimeSlotEntity[] | null {
    const result: CourtTimeSlotEntity[] = [];
    let current = startHour;

    for (const slot of slots) {
      if (slot.startHour === current) {
        result.push(slot);
        current = slot.endHour;
        if (current === endHour) return result;
      }
    }

    return null; // gap or not fully covered
  }

  async cancelBooking(id: string, userId: string): Promise<BookingEntity> {
    return this.dataSource.transaction(async (manager) => {
      // Use pessimistic lock to prevent race conditions
      // Note: cannot use relations with pessimistic_write (PostgreSQL FOR UPDATE + outer join restriction)
      const booking = await manager.findOne(BookingEntity, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (booking.userId !== userId) {
        throw new ForbiddenException('You do not have permission to cancel this booking');
      }

      if (booking.status === BookingStatus.CANCELLED) {
        throw new ConflictException('Booking is already cancelled');
      }

      if (booking.status !== BookingStatus.CONFIRMED) {
        throw new BadRequestException('Only confirmed bookings can be cancelled');
      }

      // Check if startTime is at least X hours away (configurable)
      const now = new Date();
      const startTime = new Date(booking.startTime);
      const timeDifferenceMs = startTime.getTime() - now.getTime();
      const hoursDifference = timeDifferenceMs / (1000 * 60 * 60);

      const minCancelHours = this.configService.get<number>('booking.minCancelHours', 2);

      if (hoursDifference < minCancelHours) {
        throw new BadRequestException(
          `Bookings can only be cancelled at least ${minCancelHours} hours in advance`,
        );
      }

      booking.status = BookingStatus.CANCELLED;
      booking.cancelledAt = new Date();
      return manager.save(booking);
    });
  }

  async findMyBookings(userId: string, query: GetMyBookingsDto) {
    const { page, limit, status, fromDate, toDate } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.court', 'court')
      .where('booking.userId = :userId', { userId })
      .orderBy('booking.startTime', 'DESC')
      .skip(skip)
      .take(limit);

    if (status) {
      queryBuilder.andWhere('booking.status = :status', { status });
    }

    if (fromDate) {
      queryBuilder.andWhere('booking.startTime >= :fromDate', { fromDate: new Date(fromDate) });
    }

    if (toDate) {
      queryBuilder.andWhere('booking.startTime <= :toDate', { toDate: new Date(toDate) });
    }

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
