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
    @InjectRepository(CourtEntity)
    private readonly courtRepository: Repository<CourtEntity>,
    @InjectRepository(CourtTimeSlotEntity)
    private readonly timeSlotRepository: Repository<CourtTimeSlotEntity>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async generateUniqueTransactionId(manager: any): Promise<string> {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (let i = 0; i < 20; i += 1) {
      const suffix = Array.from({ length: 4 })
        .map(() => alphabet[Math.floor(Math.random() * alphabet.length)])
        .join('');
      const transactionId = `TRX-${suffix}`;
      const existed = await manager.findOne(BookingEntity, {
        where: { transactionId },
        select: { id: true },
      });
      if (!existed) return transactionId;
    }
    throw new ConflictException('Không thể tạo mã giao dịch duy nhất, vui lòng thử lại');
  }

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
      booking.transactionId =
        booking.transactionId ?? (await this.generateUniqueTransactionId(manager));
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
  }): Promise<BookingEntity> {
    const { courtId, startTime, endTime, userId, guestName, guestPhone, note, paymentMethod } =
      payload;
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
        bookingSource: BookingSource.ADMIN,
        guestName: guestName ?? null,
        guestPhone: guestPhone ?? null,
        note: note ?? null,
        transactionId: await this.generateUniqueTransactionId(manager),
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
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const qb = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.court', 'court')
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
    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
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
    payload: { cancelledReason?: string; cancellationNote?: string },
  ) {
    const booking = await this.bookingRepository.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException('Không thể hủy booking đã hoàn thành');
    }
    booking.status = BookingStatus.CANCELLED;
    booking.cancelledAt = new Date();
    booking.cancelledBy = CancelledBy.ADMIN;
    booking.cancelledReason = payload.cancelledReason ?? null;
    booking.cancellationNote = payload.cancellationNote ?? null;
    return this.bookingRepository.save(booking);
  }

  async refundBooking(bookingId: string, refundAmount: number): Promise<BookingEntity> {
    const booking = await this.bookingRepository.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.refundedAt) throw new ConflictException('Booking này đã được hoàn tiền');
    if (refundAmount > Number(booking.totalPrice)) {
      throw new BadRequestException('Số tiền hoàn trả không được vượt quá tổng giá trị booking');
    }
    booking.refundedAt = new Date();
    booking.refundAmount = refundAmount;
    return this.bookingRepository.save(booking);
  }
}
