import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Brackets } from 'typeorm';
import { differenceInHours } from 'date-fns';
import { BookingEntity } from '../../database/entities/booking.entity';
import { CourtEntity, CourtStatus } from '../../database/entities/court.entity';
import { CourtTimeSlotEntity } from '../../database/entities/court-time-slot.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { BookingStatus, BookingSource, CancelledBy, NotificationType } from '@court-booking/shared';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { GetMyBookingsDto } from './dto/get-my-bookings.dto';

const PAYMENT_DEADLINE_MINUTES = 30;
const CANCEL_WITHIN_HOURS = 24; // Rule A: must be within 24h of creation
const NO_CANCEL_BEFORE_HOURS = 12; // Rule B: must be > 12h before start

@Injectable()
export class BookingsService {
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
  ) {}

  async getCourtSchedule(courtId: string, date: string): Promise<BookingEntity[]> {
    const startDate = new Date(`${date}T00:00:00`);
    const endDate = new Date(`${date}T23:59:59.999`);
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

      // 2. Validate time slots
      const dayOfWeek = start.getDay();
      const startHour = start.getHours();
      const endHour = end.getHours() || 24;

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
      const paymentDeadline = new Date(now.getTime() + PAYMENT_DEADLINE_MINUTES * 60 * 1000);

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

      return manager.save(booking);
    });
  }

  /**
   * REQ-17: POST /bookings/:id/confirm-payment
   * Chuyển PENDING_PAYMENT → CONFIRMED khi deadline chưa qua.
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
        throw new ConflictException('Booking đã được thanh toán');
      }

      // REQ-17.4: expired
      if (booking.status === BookingStatus.EXPIRED) {
        throw new BadRequestException('Booking đã hết hạn thanh toán');
      }

      // REQ-16.6: terminal states
      if (
        booking.status === BookingStatus.COMPLETED ||
        booking.status === BookingStatus.CANCELLED
      ) {
        throw new BadRequestException(`Không thể xác nhận booking ở trạng thái ${booking.status}`);
      }

      // Double check deadline hasn't passed (job may not have run yet)
      if (booking.paymentDeadline && booking.paymentDeadline < new Date()) {
        booking.status = BookingStatus.EXPIRED;
        booking.expiredAt = new Date();
        await manager.save(booking);
        throw new BadRequestException('Booking đã hết hạn thanh toán');
      }

      // REQ-17.3: PENDING_PAYMENT → CONFIRMED
      booking.status = BookingStatus.CONFIRMED;
      booking.paidAt = new Date();
      booking.paymentMethod = booking.paymentMethod ?? 'AUTO';
      return manager.save(booking);
    });

    // REQ-23.2: Notification on CONFIRMED
    const startTimeStr = new Date(savedBooking.startTime).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const startDateStr = new Date(savedBooking.startTime).toLocaleDateString('vi-VN');

    this.notificationsService
      .create({
        userId: savedBooking.userId!,
        type: NotificationType.BOOKING_CONFIRMED,
        title: 'Đặt sân thành công',
        message: `Bạn đã đặt thành công sân ${savedBooking.court?.name || 'thể thao'} lúc ${startTimeStr} ngày ${startDateStr}.`,
        bookingId: savedBooking.id,
      })
      .catch(console.error);

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
      if (hoursSinceCreated >= CANCEL_WITHIN_HOURS) {
        throw new BadRequestException('Chỉ có thể hủy trong vòng 24 giờ kể từ khi đặt');
      }

      // REQ-19.2: Rule B — must be > 12h before start
      const hoursUntilStart = differenceInHours(booking.startTime, now);
      if (hoursUntilStart <= NO_CANCEL_BEFORE_HOURS) {
        throw new BadRequestException('Không thể hủy đặt sân trong vòng 12 giờ trước giờ chơi');
      }

      booking.status = BookingStatus.CANCELLED;
      booking.cancelledAt = now;
      booking.cancelledBy = CancelledBy.USER;
      return manager.save(booking);
    });

    // REQ-23.2: Notification on CANCELLED
    const startTimeStr = new Date(savedBooking.startTime).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const startDateStr = new Date(savedBooking.startTime).toLocaleDateString('vi-VN');

    this.notificationsService
      .create({
        userId: savedBooking.userId!,
        type: NotificationType.BOOKING_CANCELLED,
        title: 'Đặt sân đã bị hủy',
        message: `Lịch đặt sân ${savedBooking.court?.name || ''} lúc ${startTimeStr} ngày ${startDateStr} của bạn đã được hủy thành công.`,
        bookingId: savedBooking.id,
      })
      .catch(console.error);

    return savedBooking;
  }

  async findMyBookings(userId: string, query: GetMyBookingsDto) {
    const { page, limit, status, statusGroup, fromDate, toDate } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.bookingRepository
      .createQueryBuilder('booking')
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
      cancellationDeadline.setHours(cancellationDeadline.getHours() + CANCEL_WITHIN_HOURS);

      const latestCancellableTime = new Date(b.startTime);
      latestCancellableTime.setHours(latestCancellableTime.getHours() - NO_CANCEL_BEFORE_HOURS);

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
    const booking = await this.bookingRepository.findOne({
      where: { id, userId },
      relations: ['court', 'court.images'],
    });

    if (!booking) throw new NotFoundException('Booking not found');

    const cancellationDeadline = new Date(booking.createdAt);
    cancellationDeadline.setHours(cancellationDeadline.getHours() + CANCEL_WITHIN_HOURS);

    const latestCancellableTime = new Date(booking.startTime);
    latestCancellableTime.setHours(latestCancellableTime.getHours() - NO_CANCEL_BEFORE_HOURS);

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
      throw new BadRequestException('Phải cung cấp user_id hoặc guest_name');
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (start >= end) throw new BadRequestException('Invalid booking duration');

    return this.dataSource.transaction(async (manager) => {
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
        throw new ConflictException('Sân đã được đặt trong khung giờ này');
      }

      const slots = await this.timeSlotRepository.find({
        where: { courtId, dayOfWeek: start.getDay() },
        order: { startHour: 'ASC' },
      });
      const covered = this.findCoveringSlots(slots, start.getHours(), end.getHours() || 24);
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
      const saved = await manager.save(booking);

      if (saved.userId) {
        this.notificationsService
          .create({
            userId: saved.userId,
            type: NotificationType.BOOKING_CONFIRMED,
            title: 'Đặt sân thành công',
            message: 'Lịch đặt sân của bạn đã được nhân viên xác nhận.',
            bookingId: saved.id,
          })
          .catch(console.error);
      }

      return saved;
    });
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
        .andWhere('booking.paidAt IS NOT NULL')
        .andWhere(
          '(booking.refundedAt IS NULL AND (booking.refundAmount IS NULL OR booking.refundAmount = 0))',
        );
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
      .andWhere('booking.startTime <= :now', { now })
      .andWhere('booking.endTime >= :now', { now })
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
      throw new BadRequestException('Chỉ có thể check-in booking đã xác nhận');
    }
    booking.checkedInAt = new Date();
    return this.bookingRepository.save(booking);
  }

  async adminCancelBooking(
    bookingId: string,
    payload: { cancelledReason?: string; cancellationNote?: string; cancelledBy?: CancelledBy },
  ) {
    const booking = await this.bookingRepository.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException('Không thể hủy booking đã hoàn thành');
    }
    booking.status = BookingStatus.CANCELLED;
    booking.cancelledAt = new Date();
    booking.cancelledBy = payload.cancelledBy ?? CancelledBy.ADMIN;
    booking.cancelledReason = payload.cancelledReason ?? null;
    booking.cancellationNote = payload.cancellationNote ?? null;
    return this.bookingRepository.save(booking);
  }

  async refundBooking(bookingId: string, refundAmount: number): Promise<BookingEntity> {
    const booking = await this.bookingRepository.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.refundedAt) throw new ConflictException('Booking da duoc hoan tien');

    if (![BookingStatus.CANCELLED, BookingStatus.EXPIRED].includes(booking.status)) {
      throw new BadRequestException('Chi hoan tien cho booking da huy hoac het han');
    }
    if (!booking.paidAt) {
      throw new BadRequestException('Booking chua thanh toan, khong the hoan tien');
    }
    if (refundAmount > Number(booking.totalPrice)) {
      throw new BadRequestException('Số tiền hoàn trả không được vượt quá tổng giá trị booking');
    }
    booking.refundedAt = new Date();
    booking.refundAmount = refundAmount;
    return this.bookingRepository.save(booking);
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
}
