// TODO: Bookings Service
// - createBooking trong transaction
// - Overlap check: SELECT FOR UPDATE
// - cancelBooking — ownership + business rule checks
// - getSchedule — trả về slots theo ngày

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { BookingEntity } from '../../database/entities/booking.entity';
import { CourtEntity, CourtStatus } from '../../database/entities/court.entity';
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
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async getCourtSchedule(courtId: string, date: string): Promise<BookingEntity[]> {
    const court = await this.courtRepository.findOne({ where: { id: courtId } });
    if (!court) {
      throw new NotFoundException('Court not found');
    }

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
      select: ['id', 'startTime', 'endTime', 'status'],
    });

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

      // 2. Overlap Check
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

      // 3. Calculate Price
      const totalPrice = Number(court.pricePerHour) * durationHours;

      // 4. Create Booking
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

  async cancelBooking(id: string, userId: string): Promise<BookingEntity> {
    return this.dataSource.transaction(async (manager) => {
      // Use pessimistic lock to prevent race conditions
      const booking = await manager.findOne(BookingEntity, {
        where: { id },
        relations: ['court'],
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
      .where('booking.userId = :userId', { userId });

    if (status) {
      queryBuilder.andWhere('booking.status = :status', { status });
    }

    if (fromDate) {
      queryBuilder.andWhere('booking.startTime >= :fromDate', { fromDate: new Date(fromDate) });
    }

    if (toDate) {
      queryBuilder.andWhere('booking.startTime <= :toDate', { toDate: new Date(toDate) });
    }

    queryBuilder.orderBy('booking.startTime', 'DESC');
    queryBuilder.skip(skip).take(limit);

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
