import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Brackets, QueryFailedError } from 'typeorm';
import { differenceInHours } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

import bookingConfig from '../../config/booking.config';
const BUSINESS_TIMEZONE = process.env.BUSINESS_TIMEZONE || 'Asia/Ho_Chi_Minh';
import { BookingEntity } from '../../database/entities/booking.entity';
import { CourtEntity, CourtStatus } from '../../database/entities/court.entity';
import { CourtTimeSlotEntity } from '../../database/entities/court-time-slot.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { BookingStatus, BookingSource, CancelledBy, NotificationType } from '@court-booking/shared';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { GetMyBookingsDto } from './dto/get-my-bookings.dto';

@Injectable()
export class BookingsService {
  private isBookingConflictError(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    const driverError = (error as QueryFailedError & { driverError?: { code?: string } })
      .driverError;
    return driverError?.code === '23P01' || driverError?.code === '23505';
  }

  private getCourtLabel(
    booking: Pick<BookingEntity, 'court'> & { court?: { name?: string } | null },
  ) {
    return booking.court?.name || 'your court';
  }

  private getBookingScheduleLabels(
    booking: Pick<BookingEntity, 'startTime' | 'court'> & { court?: { name?: string } | null },
  ) {
    const start = new Date(booking.startTime);
    return {
      courtName: this.getCourtLabel(booking),
      startTimeStr: start.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      startDateStr: start.toLocaleDateString('vi-VN'),
    };
  }

  private async loadBookingWithCourt(id: string): Promise<BookingEntity> {
    const booking = await this.bookingRepository
      .createQueryBuilder('booking')
      .withDeleted()
      .leftJoinAndSelect('booking.court', 'court')
      .where('booking.id = :id', { id })
      .getOne();

    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  private createConfirmedNotification(booking: BookingEntity, message?: string): Promise<unknown> {
    const { courtName, startTimeStr, startDateStr } = this.getBookingScheduleLabels(booking);
    return this.notificationsService.create({
      userId: booking.userId!,
      type: NotificationType.BOOKING_CONFIRMED,
      title: 'Booking Confirmed',
      message:
        message ||
        `You have successfully booked ${courtName} at ${startTimeStr} on ${startDateStr}.`,
      bookingId: booking.id,
    });
  }

  private createCancellationNotification(booking: BookingEntity): Promise<unknown> {
    const { courtName, startTimeStr, startDateStr } = this.getBookingScheduleLabels(booking);
    const cancelledBy = booking.cancelledBy ?? CancelledBy.USER;

    if (cancelledBy === CancelledBy.ADMIN) {
      return this.notificationsService.create({
        userId: booking.userId!,
        type: NotificationType.BOOKING_CANCELLED,
        title: 'Booking cancelled by admin',
        message: `Your booking for ${courtName} at ${startTimeStr} on ${startDateStr} was cancelled by our staff.${booking.cancelledReason ? ` Reason: ${booking.cancelledReason}.` : ''}`,
        bookingId: booking.id,
      });
    }

    if (cancelledBy === CancelledBy.SYSTEM) {
      return this.notificationsService.create({
        userId: booking.userId!,
        type: NotificationType.BOOKING_CANCELLED,
        title: 'Booking cancelled by system',
        message: `Your booking for ${courtName} at ${startTimeStr} on ${startDateStr} was cancelled automatically.${booking.cancellationNote ? ` ${booking.cancellationNote}` : ''}`,
        bookingId: booking.id,
      });
    }

    return this.notificationsService.create({
      userId: booking.userId!,
      type: NotificationType.BOOKING_CANCELLED,
      title: 'Booking Cancelled',
      message: `Your booking for ${courtName} at ${startTimeStr} on ${startDateStr} has been successfully cancelled.`,
      bookingId: booking.id,
    });
  }

  private createRefundNotification(booking: BookingEntity): Promise<unknown> {
    const { courtName } = this.getBookingScheduleLabels(booking);
    return this.notificationsService.create({
      userId: booking.userId!,
      type: NotificationType.REFUND_PROCESSED,
      title: 'Refund processed',
      message: `A refund of ${Number(booking.refundAmount || 0).toLocaleString('vi-VN')} VND for your booking at ${courtName} has been processed.`,
      bookingId: booking.id,
    });
  }

  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(CourtEntity)
    private readonly courtRepository: Repository<CourtEntity>,
    @InjectRepository(CourtTimeSlotEntity)
    private readonly timeSlotRepository: Repository<CourtTimeSlotEntity>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
    private readonly settingsService: SettingsService,
    @Inject(bookingConfig.KEY)
    private readonly bookingCfg: ConfigType<typeof bookingConfig>,
  ) {}

  async getCourtSchedule(courtId: string, date: string): Promise<BookingEntity[]> {
    const BUSINESS_TIMEZONE = process.env.BUSINESS_TIMEZONE || 'Asia/Ho_Chi_Minh';
    const startDate = toZonedTime(`${date}T00:00:00`, BUSINESS_TIMEZONE);
    const endDate = toZonedTime(`${date}T23:59:59.999`, BUSINESS_TIMEZONE);
    const now = new Date();

    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .select([
        'booking.id',
        'booking.startTime',
        'booking.endTime',
        'booking.status',
        'booking.paymentDeadline',
      ])
      .where('booking.courtId = :courtId', { courtId })
      .andWhere('booking.startTime BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere(
        new Brackets((qb) => {
          qb.where('booking.status = :confirmedStatus', {
            confirmedStatus: BookingStatus.CONFIRMED,
          }).orWhere(
            'booking.status = :pendingStatus AND booking.paymentDeadline IS NOT NULL AND booking.paymentDeadline > :now',
            {
              pendingStatus: BookingStatus.PENDING_PAYMENT,
              now,
            },
          );
        }),
      )
      .orderBy('booking.startTime', 'ASC')
      .getMany();

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

    if (durationHours > this.bookingCfg.maxBookingDurationHours) {
      throw new BadRequestException(
        `Booking duration cannot exceed ${this.bookingCfg.maxBookingDurationHours} hours`,
      );
    }

    if (start.getMinutes() !== 0 || end.getMinutes() !== 0) {
      throw new BadRequestException('Booking must start and end on the hour (e.g. 08:00, 10:00)');
    }

    const paymentDeadlineMinutes = await this.settingsService.getNumber(
      'payment_deadline_minutes',
      30,
    );

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

      // 2. Validate time slots
      const zonedStart = toZonedTime(start, BUSINESS_TIMEZONE);
      const zonedEnd = toZonedTime(end, BUSINESS_TIMEZONE);
      const dayOfWeek = zonedStart.getDay();
      const startHour = zonedStart.getHours();
      const endHour = zonedEnd.getHours() || 24;

      const slots = await this.timeSlotRepository.find({
        where: { courtId, dayOfWeek },
        order: { startHour: 'ASC' },
      });

      if (slots.length === 0) {
        throw new BadRequestException('Court has no available time slots for this day');
      }

      const coveredSlots = this.findCoveringSlots(slots, startHour, endHour);
      if (!coveredSlots) {
        throw new BadRequestException(
          'Requested time range is not covered by available time slots',
        );
      }

      // 3. Overlap Check — REQ-16.7: only CONFIRMED blocks slot
      const overlapCheckTime = new Date();
      const overlappingBookings = await manager
        .createQueryBuilder(BookingEntity, 'booking')
        .where('booking.courtId = :courtId', { courtId })
        .andWhere(
          new Brackets((qb) => {
            qb.where('booking.status = :confirmedStatus', {
              confirmedStatus: BookingStatus.CONFIRMED,
            }).orWhere(
              'booking.status = :pendingStatus AND booking.paymentDeadline IS NOT NULL AND booking.paymentDeadline > :now',
              {
                pendingStatus: BookingStatus.PENDING_PAYMENT,
                now: overlapCheckTime,
              },
            );
          }),
        )
        .andWhere('booking.startTime < :endTime', { endTime: end })
        .andWhere('booking.endTime > :startTime', { startTime: start })
        .getMany();

      if (overlappingBookings.length > 0) {
        throw new ConflictException('Court is already booked for the selected time slot');
      }

      // 4. Calculate price
      const totalPrice = coveredSlots.reduce((sum, slot) => sum + Number(slot.price), 0);

      // 5. Create Booking — REQ-16.2: default PENDING_PAYMENT + paymentDeadline
      const now = new Date();
      const paymentDeadline = new Date(now.getTime() + paymentDeadlineMinutes * 60 * 1000);

      const booking = manager.create(BookingEntity, {
        courtId,
        userId,
        startTime: start,
        endTime: end,
        totalPrice,
        status: BookingStatus.PENDING_PAYMENT,
        paymentDeadline,
        bookingSource: BookingSource.ONLINE,
        note: createBookingDto.note ?? null,
      });

      try {
        return await manager.save(booking);
      } catch (error) {
        if (this.isBookingConflictError(error)) {
          throw new ConflictException('Court is already booked for the selected time slot');
        }
        throw error;
      }
    });
  }

  /**
   * REQ-17: POST /bookings/:id/confirm-payment
   * Transition PENDING_PAYMENT -> CONFIRMED when the deadline has not expired.
   */
  async confirmPayment(bookingId: string, userId: string): Promise<BookingEntity> {
    const savedBooking = await this.dataSource.transaction(async (manager) => {
      const booking = await manager.findOne(BookingEntity, {
        where: { id: bookingId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!booking) throw new NotFoundException('Booking not found');
      if (booking.userId !== userId) throw new ForbiddenException();

      // REQ-17.5: already confirmed
      if (booking.status === BookingStatus.CONFIRMED) {
        throw new ConflictException('Booking is already paid');
      }

      // REQ-17.4: expired
      if (booking.status === BookingStatus.EXPIRED) {
        throw new BadRequestException('Booking payment window has expired');
      }

      // REQ-16.6: terminal states
      if (
        booking.status === BookingStatus.COMPLETED ||
        booking.status === BookingStatus.CANCELLED
      ) {
        throw new BadRequestException(`Cannot confirm booking in state ${booking.status}`);
      }

      // Double check deadline hasn't passed (job may not have run yet)
      if (booking.paymentDeadline && booking.paymentDeadline < new Date()) {
        booking.status = BookingStatus.EXPIRED;
        booking.expiredAt = new Date();
        await manager.save(booking);
        throw new BadRequestException('Booking payment window has expired');
      }

      // REQ-17.3: PENDING_PAYMENT → CONFIRMED
      booking.status = BookingStatus.CONFIRMED;
      booking.paidAt = new Date();
      booking.paymentMethod = booking.paymentMethod ?? 'AUTO';
      return manager.save(booking);
    });

    const bookingWithCourt = await this.loadBookingWithCourt(savedBooking.id).catch(
      () => savedBooking,
    );
    this.createConfirmedNotification(bookingWithCourt).catch(console.error);

    return savedBooking;
  }

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

    return null;
  }

  /**
   * REQ-19: Cancel policy — 24h creation window + 12h before start
   */
  async cancelBooking(id: string, userId: string): Promise<BookingEntity> {
    const cancelWithinHours = await this.settingsService.getNumber('cancel_within_hours', 24);
    const noCancelBeforeHours = await this.settingsService.getNumber('no_cancel_before_hours', 12);

    const savedBooking = await this.dataSource.transaction(async (manager) => {
      const booking = await manager.findOne(BookingEntity, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!booking) throw new NotFoundException('Booking not found');
      if (booking.userId !== userId) {
        throw new ForbiddenException('You do not have permission to cancel this booking');
      }

      if (booking.status === BookingStatus.CANCELLED) {
        throw new ConflictException('Booking is already cancelled');
      }

      const now = new Date();

      if (booking.status === BookingStatus.PENDING_PAYMENT) {
        booking.status = BookingStatus.CANCELLED;
        booking.cancelledAt = now;
        booking.cancelledBy = CancelledBy.USER;
        return manager.save(booking);
      }

      if (booking.status !== BookingStatus.CONFIRMED) {
        throw new BadRequestException(
          'Only pending payment or confirmed bookings can be cancelled',
        );
      }

      // REQ-19.3: Rule A — must cancel within 24h of creation
      const hoursSinceCreated = differenceInHours(now, booking.createdAt);
      if (hoursSinceCreated >= cancelWithinHours) {
        throw new BadRequestException(
          `Only cancellations within ${cancelWithinHours} hours of booking are allowed`,
        );
      }

      // REQ-19.2: Rule B — must be > 12h before start
      const hoursUntilStart = differenceInHours(booking.startTime, now);
      if (hoursUntilStart <= noCancelBeforeHours) {
        throw new BadRequestException(
          `Cannot cancel booking within ${noCancelBeforeHours} hours of the scheduled playtime`,
        );
      }

      booking.status = BookingStatus.CANCELLED;
      booking.cancelledAt = now;
      booking.cancelledBy = CancelledBy.USER;
      return manager.save(booking);
    });

    const bookingWithCourt = await this.loadBookingWithCourt(savedBooking.id).catch(
      () => savedBooking,
    );
    this.createCancellationNotification(bookingWithCourt).catch(console.error);

    return savedBooking;
  }

  async findMyBookings(userId: string, query: GetMyBookingsDto) {
    const cancelWithinHours = await this.settingsService.getNumber('cancel_within_hours', 24);
    const noCancelBeforeHours = await this.settingsService.getNumber('no_cancel_before_hours', 12);

    const { page, limit, status, statusGroup, fromDate, toDate } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.bookingRepository
      .createQueryBuilder('booking')
      .withDeleted()
      .leftJoinAndSelect('booking.court', 'court')
      .leftJoinAndSelect('court.images', 'courtImages')
      .where('booking.userId = :userId', { userId })
      .orderBy('booking.startTime', 'DESC')
      .skip(skip)
      .take(limit);

    if (status) {
      queryBuilder.andWhere('booking.status = :status', { status });
    } else if (statusGroup === 'failed') {
      queryBuilder.andWhere('booking.status IN (:...failedStatuses)', {
        failedStatuses: [BookingStatus.CANCELLED, BookingStatus.EXPIRED],
      });
    }

    if (fromDate) {
      queryBuilder.andWhere('booking.startTime >= :fromDate', { fromDate: new Date(fromDate) });
    }

    if (toDate) {
      queryBuilder.andWhere('booking.startTime <= :toDate', { toDate: new Date(toDate) });
    }

    const [items, total] = await queryBuilder.getManyAndCount();

    // REQ-19.6: Compute cancellationDeadline + latestCancellableTime for each booking
    const enriched = items.map((b) => {
      const cancellationDeadline = new Date(b.createdAt);
      cancellationDeadline.setHours(cancellationDeadline.getHours() + cancelWithinHours);

      const latestCancellableTime = new Date(b.startTime);
      latestCancellableTime.setHours(latestCancellableTime.getHours() - noCancelBeforeHours);

      return {
        ...b,
        cancellationDeadline: cancellationDeadline.toISOString(),
        latestCancellableTime: latestCancellableTime.toISOString(),
      };
    });

    return {
      data: enriched,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMyBookingStats(userId: string) {
    const now = new Date();
    const validStatuses = [BookingStatus.CONFIRMED, BookingStatus.COMPLETED];

    const totalBookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.userId = :userId', { userId })
      .andWhere('booking.status IN (:...validStatuses)', { validStatuses })
      .getCount();

    const upcomingBookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.userId = :userId', { userId })
      .andWhere('booking.startTime > :now', { now })
      .andWhere('booking.status IN (:...validStatuses)', { validStatuses })
      .getCount();

    const totalSpendRaw = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('COALESCE(SUM(booking.totalPrice), 0)', 'totalSpend')
      .where('booking.userId = :userId', { userId })
      .andWhere('booking.status IN (:...validStatuses)', { validStatuses })
      .getRawOne<{ totalSpend: string }>();

    return {
      totalBookings,
      upcomingBookings,
      totalSpend: Number(totalSpendRaw?.totalSpend || 0),
    };
  }

  async findOne(
    id: string,
    userId: string,
  ): Promise<BookingEntity & { cancellationDeadline: string; latestCancellableTime: string }> {
    const cancelWithinHours = await this.settingsService.getNumber('cancel_within_hours', 24);
    const noCancelBeforeHours = await this.settingsService.getNumber('no_cancel_before_hours', 12);

    const booking = await this.bookingRepository
      .createQueryBuilder('booking')
      .withDeleted()
      .leftJoinAndSelect('booking.court', 'court')
      .leftJoinAndSelect('court.images', 'courtImages')
      .where('booking.id = :id', { id })
      .andWhere('booking.userId = :userId', { userId })
      .getOne();

    if (!booking) throw new NotFoundException('Booking not found');

    const cancellationDeadline = new Date(booking.createdAt);
    cancellationDeadline.setHours(cancellationDeadline.getHours() + cancelWithinHours);

    const latestCancellableTime = new Date(booking.startTime);
    latestCancellableTime.setHours(latestCancellableTime.getHours() - noCancelBeforeHours);

    return {
      ...booking,
      cancellationDeadline: cancellationDeadline.toISOString(),
      latestCancellableTime: latestCancellableTime.toISOString(),
    };
  }

  async createAdminBooking(payload: {
    courtId: string;
    startTime: string;
    endTime: string;
    userId?: string | null;
    guestName?: string;
    guestPhone?: string;
    note?: string;
    paymentMethod?: string;
    bookingSource?: BookingSource;
  }): Promise<BookingEntity> {
    const {
      courtId,
      startTime,
      endTime,
      userId,
      guestName,
      guestPhone,
      note,
      paymentMethod,
      bookingSource,
    } = payload;
    if (!userId && !guestName?.trim()) {
      throw new BadRequestException('Must provide user_id or guest_name');
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (durationHours <= 0) throw new BadRequestException('Invalid booking duration');

    if (durationHours > this.bookingCfg.maxBookingDurationHours) {
      throw new BadRequestException(
        `Booking duration cannot exceed ${this.bookingCfg.maxBookingDurationHours} hours`,
      );
    }

    if (start.getMinutes() !== 0 || end.getMinutes() !== 0) {
      throw new BadRequestException('Booking must start and end on the hour (e.g. 08:00, 10:00)');
    }

    const savedBooking = await this.dataSource.transaction(async (manager) => {
      const court = await manager.findOne(CourtEntity, {
        where: { id: courtId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!court) throw new NotFoundException('Court not found');

      const overlapping = await manager
        .createQueryBuilder(BookingEntity, 'booking')
        .where('booking.courtId = :courtId', { courtId })
        .andWhere('booking.startTime < :endTime', { endTime: end })
        .andWhere('booking.endTime > :startTime', { startTime: start })
        .andWhere(
          new Brackets((qb) => {
            qb.where('booking.status = :confirmed', { confirmed: BookingStatus.CONFIRMED }).orWhere(
              'booking.status = :pending AND booking.paymentDeadline IS NOT NULL AND booking.paymentDeadline > :now',
              { pending: BookingStatus.PENDING_PAYMENT, now: new Date() },
            );
          }),
        )
        .getCount();

      if (overlapping > 0) {
        throw new ConflictException('The requested court is already booked for this time slot');
      }

      const zonedStart = toZonedTime(start, BUSINESS_TIMEZONE);
      const zonedEnd = toZonedTime(end, BUSINESS_TIMEZONE);

      const slots = await this.timeSlotRepository.find({
        where: { courtId, dayOfWeek: zonedStart.getDay() },
        order: { startHour: 'ASC' },
      });
      const covered = this.findCoveringSlots(
        slots,
        zonedStart.getHours(),
        zonedEnd.getHours() || 24,
      );
      if (!covered)
        throw new BadRequestException(
          'Requested time range is not covered by available time slots',
        );
      const totalPrice = covered.reduce((sum, slot) => sum + Number(slot.price), 0);

      const booking = manager.create(BookingEntity, {
        courtId,
        userId: userId ?? null,
        startTime: start,
        endTime: end,
        totalPrice,
        status: BookingStatus.CONFIRMED,
        paidAt: new Date(),
        paymentDeadline: null,
        paymentMethod: paymentMethod ?? null,
        bookingSource: bookingSource ?? BookingSource.ADMIN,
        guestName: guestName ?? null,
        guestPhone: guestPhone ?? null,
        note: note ?? null,
      });
      let saved: BookingEntity;
      try {
        saved = await manager.save(booking);
      } catch (error) {
        if (this.isBookingConflictError(error)) {
          throw new ConflictException('The requested court is already booked for this time slot');
        }
        throw error;
      }

      return saved;
    });

    if (savedBooking.userId) {
      const bookingWithCourt = await this.loadBookingWithCourt(savedBooking.id).catch(
        () => savedBooking,
      );
      this.createConfirmedNotification(
        bookingWithCourt,
        'Your booking has been confirmed by our staff.',
      ).catch(console.error);
    }

    return savedBooking;
  }

  async getAdminBookings(query: {
    page?: number;
    limit?: number;
    status?: BookingStatus;
    bookingSource?: BookingSource;
    courtId?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    sportTypeId?: string;
    day?: string;
    statusView?: 'CANCELLED_GROUP' | 'REFUND_PENDING';
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const qb = this.bookingRepository
      .createQueryBuilder('booking')
      .withDeleted()
      .leftJoinAndSelect('booking.court', 'court')
      .leftJoinAndSelect('booking.user', 'user')
      .orderBy('booking.startTime', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (query.status) qb.andWhere('booking.status = :status', { status: query.status });
    if (query.bookingSource)
      qb.andWhere('booking.bookingSource = :bookingSource', { bookingSource: query.bookingSource });
    if (query.courtId) qb.andWhere('booking.courtId = :courtId', { courtId: query.courtId });
    if (query.dateFrom)
      qb.andWhere('booking.startTime >= :dateFrom', { dateFrom: new Date(query.dateFrom) });
    if (query.dateTo)
      qb.andWhere('booking.startTime <= :dateTo', { dateTo: new Date(query.dateTo) });
    if (query.search?.trim()) {
      const s = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('LOWER(booking.id::text) LIKE :s', { s })
            .orWhere('LOWER(court.name) LIKE :s', { s })
            .orWhere('LOWER(user.name) LIKE :s', { s })
            .orWhere('LOWER(booking.guestName) LIKE :s', { s });
        }),
      );
    }
    if (query.sportTypeId) {
      qb.andWhere('court.sportTypeId = :sportTypeId', { sportTypeId: query.sportTypeId });
    }
    if (query.day) {
      const dayStart = new Date(`${query.day}T00:00:00`);
      const dayEnd = new Date(`${query.day}T23:59:59.999`);
      qb.andWhere('booking.startTime >= :dayStart', { dayStart }).andWhere(
        'booking.startTime <= :dayEnd',
        { dayEnd },
      );
    }
    if (query.statusView === 'CANCELLED_GROUP') {
      qb.andWhere('booking.status IN (:...cancelledLike)', {
        cancelledLike: [BookingStatus.CANCELLED, BookingStatus.EXPIRED],
      });
    }
    if (query.statusView === 'REFUND_PENDING') {
      qb.andWhere('booking.status IN (:...cancelledLike)', {
        cancelledLike: [BookingStatus.CANCELLED, BookingStatus.EXPIRED],
      })
        .andWhere('(booking.paidAt IS NOT NULL OR booking.refundAmount IS NOT NULL)')
        .andWhere('booking.refundedAt IS NULL');
    }
    const [data, total] = await qb.getManyAndCount();
    const enriched = data.map((item: BookingEntity & { user?: { name?: string } }) => ({
      ...item,
      customerName: item.guestName || item.user?.name || 'Member',
    }));
    const now = new Date();
    const liveSessions = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.status = :status', { status: BookingStatus.CONFIRMED })
      .andWhere('booking.startTime <= :now', { now })
      .andWhere('booking.endTime >= :now', { now })
      .getCount();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const dailyRevenueRaw = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('COALESCE(SUM(booking.totalPrice), 0)', 'total')
      .where('booking.status IN (:...statuses)', {
        statuses: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED],
      })
      .andWhere('booking.startTime >= :todayStart', { todayStart })
      .andWhere('booking.startTime <= :todayEnd', { todayEnd })
      .getRawOne<{ total: string }>();

    const [totalAll, confirmedCount, completedCount, adminWalkInCount, cancelledLikeCount] =
      await Promise.all([
        this.bookingRepository.count(),
        this.bookingRepository.count({ where: { status: BookingStatus.CONFIRMED } }),
        this.bookingRepository.count({ where: { status: BookingStatus.COMPLETED } }),
        this.bookingRepository
          .createQueryBuilder('booking')
          .where('booking.bookingSource IN (:...sources)', {
            sources: [BookingSource.ADMIN, BookingSource.WALK_IN],
          })
          .getCount(),
        this.bookingRepository
          .createQueryBuilder('booking')
          .where('booking.status IN (:...statuses)', {
            statuses: [BookingStatus.CANCELLED, BookingStatus.EXPIRED],
          })
          .getCount(),
      ]);
    const confirmedOrCompleted = confirmedCount + completedCount;

    return {
      data: enriched,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      summary: {
        total: totalAll,
        confirmed: confirmedCount,
        confirmedOrCompleted,
        adminWalkIn: adminWalkInCount,
        cancelled: cancelledLikeCount,
        liveSessions,
        dailyRevenue: Number(dailyRevenueRaw?.total ?? 0),
      },
    };
  }

  async getAdminOverview(dateFrom: string, dateTo: string) {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
      throw new BadRequestException('Invalid date range');
    }

    const now = new Date();

    const activeBookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.status = :status', { status: BookingStatus.CONFIRMED })
      .andWhere('booking.endTime > :now', { now })
      .getCount();

    const completedInWindow = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.status = :completed', { completed: BookingStatus.COMPLETED })
      .andWhere('booking.startTime >= :from', { from })
      .andWhere('booking.startTime <= :to', { to })
      .getCount();

    const bookableStatuses = [BookingStatus.CONFIRMED, BookingStatus.COMPLETED];
    const bookingRows = await this.bookingRepository
      .createQueryBuilder('booking')
      .select(['booking.startTime', 'booking.endTime', 'booking.totalPrice', 'booking.status'])
      .where('booking.status IN (:...statuses)', { statuses: bookableStatuses })
      .andWhere('booking.startTime < :to', { to })
      .andWhere('booking.endTime > :from', { from })
      .getMany();

    let bookedHours = 0;
    let totalRevenue = 0;
    for (const b of bookingRows) {
      totalRevenue += Number(b.totalPrice);
      const overlapStart = Math.max(new Date(b.startTime).getTime(), from.getTime());
      const overlapEnd = Math.min(new Date(b.endTime).getTime(), to.getTime());
      if (overlapEnd > overlapStart) {
        bookedHours += (overlapEnd - overlapStart) / (1000 * 60 * 60);
      }
    }

    const activeCourts = await this.courtRepository.find({
      where: { status: CourtStatus.ACTIVE },
      select: { id: true },
    });
    const courtIds = activeCourts.map((c) => c.id);

    const slots =
      courtIds.length > 0
        ? await this.timeSlotRepository.find({
            where: courtIds.map((courtId) => ({ courtId })),
            select: { courtId: true, dayOfWeek: true, startHour: true, endHour: true },
          })
        : [];

    const hoursPerDay = new Map<number, number>();
    for (const slot of slots) {
      const d = slot.dayOfWeek;
      hoursPerDay.set(d, (hoursPerDay.get(d) ?? 0) + (slot.endHour - slot.startHour));
    }

    let availableHours = 0;
    for (let d = new Date(from); d < to; d.setDate(d.getDate() + 1)) {
      availableHours += hoursPerDay.get(d.getDay()) ?? 0;
    }

    const occupancyRate = availableHours > 0 ? (bookedHours / availableHours) * 100 : 0;
    const newCustomers = await this.userRepository
      .createQueryBuilder('user')
      .where('user.createdAt >= :from', { from })
      .andWhere('user.createdAt <= :to', { to })
      .getCount();

    return {
      window: { dateFrom, dateTo },
      activeBookings,
      newCustomers,
      completedBookings: completedInWindow,
      totalRevenue,
      bookedHours: Number(bookedHours.toFixed(2)),
      availableHours: Number(availableHours.toFixed(2)),
      occupancyRate: Number(Math.min(100, occupancyRate).toFixed(1)),
    };
  }

  async checkInBooking(bookingId: string): Promise<BookingEntity> {
    const booking = await this.bookingRepository.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Only confirmed bookings can be checked in');
    }
    booking.checkedInAt = new Date();
    return this.bookingRepository.save(booking);
  }

  async adminCancelBooking(
    bookingId: string,
    payload: { cancelledReason?: string; cancellationNote?: string; cancelledBy?: CancelledBy },
  ) {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['court'],
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed booking');
    }
    booking.status = BookingStatus.CANCELLED;
    booking.cancelledAt = new Date();
    booking.cancelledBy = payload.cancelledBy ?? CancelledBy.ADMIN;
    booking.cancelledReason = payload.cancelledReason ?? null;
    booking.cancellationNote = payload.cancellationNote ?? null;
    const saved = await this.bookingRepository.save(booking);
    if (saved.userId) {
      this.createCancellationNotification(saved).catch(console.error);
    }
    return saved;
  }

  async refundBooking(bookingId: string, refundAmount: number): Promise<BookingEntity> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['court'],
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.refundedAt) throw new ConflictException('Booking has already been refunded');

    if (![BookingStatus.CANCELLED, BookingStatus.EXPIRED].includes(booking.status)) {
      throw new BadRequestException(
        'Refunds can only be processed for cancelled or expired bookings',
      );
    }
    if (!booking.paidAt) {
      throw new BadRequestException('Cannot refund an unpaid booking');
    }
    if (refundAmount > Number(booking.totalPrice)) {
      throw new BadRequestException('Refund amount cannot exceed the total booking price');
    }
    booking.refundedAt = new Date();
    booking.refundAmount = refundAmount;
    const saved = await this.bookingRepository.save(booking);
    if (saved.userId) {
      this.createRefundNotification(saved).catch(console.error);
    }
    return saved;
  }

  async updateAdminBooking(
    bookingId: string,
    payload: {
      guestName?: string | null;
      guestPhone?: string | null;
      note?: string | null;
      paymentMethod?: string | null;
      cancelledReason?: string | null;
      cancellationNote?: string | null;
      cancelledBy?: CancelledBy | null;
    },
  ): Promise<BookingEntity> {
    const booking = await this.bookingRepository.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');

    if (payload.guestName !== undefined) booking.guestName = payload.guestName;
    if (payload.guestPhone !== undefined) booking.guestPhone = payload.guestPhone;
    if (payload.note !== undefined) booking.note = payload.note;
    if (payload.paymentMethod !== undefined) booking.paymentMethod = payload.paymentMethod;
    if (payload.cancelledReason !== undefined) booking.cancelledReason = payload.cancelledReason;
    if (payload.cancellationNote !== undefined) booking.cancellationNote = payload.cancellationNote;
    if (payload.cancelledBy !== undefined) booking.cancelledBy = payload.cancelledBy;

    return this.bookingRepository.save(booking);
  }

  async getAdminCourtAnalytics(dateFrom: string, dateTo: string, courtId?: string) {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
      throw new BadRequestException('Invalid date range');
    }

    const statuses = [BookingStatus.CONFIRMED, BookingStatus.COMPLETED];
    const qb = this.bookingRepository
      .createQueryBuilder('booking')
      .withDeleted()
      .leftJoinAndSelect('booking.court', 'court')
      .where('booking.status IN (:...statuses)', { statuses })
      .andWhere('booking.startTime < :to', { to })
      .andWhere('booking.endTime > :from', { from });
    if (courtId) qb.andWhere('booking.courtId = :courtId', { courtId });
    const rows = await qb.getMany();

    const totalRevenue = rows.reduce((sum, b) => sum + Number(b.totalPrice || 0), 0);
    const totalBookings = rows.length;
    const byCourt = new Map<
      string,
      {
        courtName: string;
        sportTypeId: string | null;
        bookingCount: number;
        totalRevenue: number;
        bookedHours: number;
      }
    >();
    let totalBookedHours = 0;
    for (const b of rows) {
      const overlapStart = Math.max(new Date(b.startTime).getTime(), from.getTime());
      const overlapEnd = Math.min(new Date(b.endTime).getTime(), to.getTime());
      const overlapHours = overlapEnd > overlapStart ? (overlapEnd - overlapStart) / 3600000 : 0;
      totalBookedHours += overlapHours;

      const key = b.courtId;
      const current = byCourt.get(key) ?? {
        courtName: b.court?.name ?? 'Unknown court',
        sportTypeId: b.court?.sportTypeId ?? null,
        bookingCount: 0,
        totalRevenue: 0,
        bookedHours: 0,
      };
      current.bookingCount += 1;
      current.totalRevenue += Number(b.totalPrice || 0);
      current.bookedHours += overlapHours;
      byCourt.set(key, current);
    }

    const courts = await this.courtRepository.find({
      where: courtId ? { id: courtId } : { status: CourtStatus.ACTIVE },
      select: { id: true, name: true },
    });
    const courtIds = courts.map((c) => c.id);
    const slots =
      courtIds.length > 0
        ? await this.timeSlotRepository.find({
            where: courtIds.map((id) => ({ courtId: id })),
            select: { courtId: true, dayOfWeek: true, startHour: true, endHour: true },
          })
        : [];
    const courtHoursPerDay = new Map<string, Map<number, number>>();
    for (const slot of slots) {
      if (!courtHoursPerDay.has(slot.courtId)) courtHoursPerDay.set(slot.courtId, new Map());
      const m = courtHoursPerDay.get(slot.courtId)!;
      m.set(slot.dayOfWeek, (m.get(slot.dayOfWeek) ?? 0) + (slot.endHour - slot.startHour));
    }
    let totalAvailableHours = 0;
    for (let d = new Date(from); d < to; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      for (const c of courts) {
        totalAvailableHours += courtHoursPerDay.get(c.id)?.get(dow) ?? 0;
      }
    }
    const avgUtilization =
      totalAvailableHours > 0 ? (totalBookedHours / totalAvailableHours) * 100 : 0;

    const analyticsStartHour = await this.settingsService.getNumber('analytics_start_hour', 6);
    const analyticsEndHour = await this.settingsService.getNumber('analytics_end_hour', 22);
    const safeStartHour = Math.min(23, Math.max(0, analyticsStartHour));
    const safeEndHour = Math.min(24, Math.max(safeStartHour + 1, analyticsEndHour));
    const heatmapHourLength = safeEndHour - safeStartHour;

    const heatmap = Array.from({ length: 7 }, (_, day) => ({
      day,
      hours: Array.from({ length: heatmapHourLength }, (_, i) => ({
        hour: i + safeStartHour,
        count: 0,
      })),
    }));
    for (const b of rows) {
      const start = new Date(b.startTime);
      const end = new Date(b.endTime);
      const day = start.getDay();
      const fromHour = Math.max(safeStartHour, start.getHours());
      const toHour = Math.min(safeEndHour, end.getHours() || 24);
      for (let h = fromHour; h < toHour; h++) {
        const idx = h - safeStartHour;
        if (idx >= 0 && idx < heatmap[day].hours.length) heatmap[day].hours[idx].count += 1;
      }
    }

    const revenueByCourt = Array.from(byCourt.entries())
      .map(([id, item]) => ({
        courtId: id,
        courtName: item.courtName,
        sportTypeId: item.sportTypeId,
        bookings: item.bookingCount,
        hoursBooked: Number(item.bookedHours.toFixed(2)),
        avgHourlyRate:
          item.bookedHours > 0 ? Number((item.totalRevenue / item.bookedHours).toFixed(0)) : 0,
        netRevenue: Number(item.totalRevenue.toFixed(0)),
      }))
      .sort((a, b) => b.netRevenue - a.netRevenue);

    const currentPeriodUsersRaw = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('DISTINCT booking.userId', 'userId')
      .where('booking.userId IS NOT NULL')
      .andWhere('booking.status IN (:...statuses)', { statuses })
      .andWhere('booking.startTime >= :from', { from })
      .andWhere('booking.startTime <= :to', { to })
      .getRawMany<{ userId: string }>();
    const currentUserIds = currentPeriodUsersRaw.map((r) => r.userId).filter(Boolean);
    const totalUniqueCustomers = currentUserIds.length;

    let newCustomers = 0;
    let returningCustomers = 0;
    if (currentUserIds.length > 0) {
      newCustomers = await this.userRepository
        .createQueryBuilder('user')
        .where('user.id IN (:...userIds)', { userIds: currentUserIds })
        .andWhere('user.createdAt >= :from', { from })
        .andWhere('user.createdAt <= :to', { to })
        .getCount();

      const returningUserRows = await this.bookingRepository
        .createQueryBuilder('booking')
        .select('DISTINCT booking.userId', 'userId')
        .where('booking.userId IN (:...userIds)', { userIds: currentUserIds })
        .andWhere('booking.status IN (:...statuses)', { statuses })
        .andWhere('booking.startTime < :from', { from })
        .getRawMany<{ userId: string }>();
      returningCustomers = returningUserRows.length;
    }
    const otherCustomers = Math.max(0, totalUniqueCustomers - newCustomers - returningCustomers);
    let age18_24 = 0;
    let age25_34 = 0;
    let age35_44 = 0;
    let age45Plus = 0;
    if (currentUserIds.length > 0) {
      const users = await this.userRepository
        .createQueryBuilder('user')
        .select(['user.id', 'user.dob'])
        .where('user.id IN (:...userIds)', { userIds: currentUserIds })
        .andWhere('user.dob IS NOT NULL')
        .getMany();
      const now = new Date();
      for (const u of users) {
        if (!u.dob) continue;
        const dob = new Date(u.dob);
        if (Number.isNaN(dob.getTime())) continue;
        let age = now.getFullYear() - dob.getFullYear();
        const m = now.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
        if (age >= 18 && age <= 24) age18_24 += 1;
        else if (age >= 25 && age <= 34) age25_34 += 1;
        else if (age >= 35 && age <= 44) age35_44 += 1;
        else if (age >= 45) age45Plus += 1;
      }
    }

    return {
      window: { dateFrom, dateTo, courtId: courtId ?? null },
      heatmapRange: { startHour: safeStartHour, endHour: safeEndHour },
      kpis: {
        totalRevenue: Number(totalRevenue.toFixed(0)),
        avgUtilization: Number(Math.min(100, avgUtilization).toFixed(1)),
        totalBookings,
        bookedHours: Number(totalBookedHours.toFixed(2)),
        availableHours: Number(totalAvailableHours.toFixed(2)),
      },
      heatmap,
      revenueByCourt,
      customerDemographics: {
        totalUniqueCustomers,
        newCustomers,
        returningCustomers,
        otherCustomers,
        ageDistribution: {
          age18_24,
          age25_34,
          age35_44,
          age45Plus,
        },
      },
    };
  }
}
