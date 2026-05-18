import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan } from 'typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import { BookingStatus, NotificationType } from '@court-booking/shared';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
@Processor('booking-jobs')
export class BookingJobsProcessor {
  private readonly logger = new Logger(BookingJobsProcessor.name);

  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * REQ-17.6: Auto-expire PENDING_PAYMENT bookings past their deadline.
   * REQ-17.8: Send notification on EXPIRED.
   */
  @Process({ name: 'expire-pending', concurrency: 1 })
  async expirePendingBookings(_job: Job): Promise<void> {
    const now = new Date();

    const expiredBookings = await this.bookingRepo.find({
      where: {
        status: BookingStatus.PENDING_PAYMENT,
        paymentDeadline: LessThan(now),
      },
      relations: ['court'],
    });

    if (expiredBookings.length === 0) return;

    let expiredCount = 0;
    for (const booking of expiredBookings) {
      const result = await this.bookingRepo.update(
        { id: booking.id, status: BookingStatus.PENDING_PAYMENT },
        { status: BookingStatus.EXPIRED, expiredAt: now },
      );

      if (result.affected && result.affected > 0) {
        expiredCount++;
        await this.notificationsService.create({
          userId: booking.userId!,
          type: NotificationType.BOOKING_EXPIRED,
          title: 'Booking payment window expired',
          message: `Your booking reservation for ${booking.court?.name || ''} has been cancelled due to payment timeout.`,
          bookingId: booking.id,
        });
      }
    }

    this.logger.log(`Expired and notified ${expiredCount} booking(s)`);
  }

  /**
   * REQ-16.5: Auto-complete CONFIRMED bookings past their end_time.
   */
  @Process({ name: 'complete-confirmed', concurrency: 1 })
  async completeConfirmedBookings(_job: Job): Promise<void> {
    const now = new Date();

    const result = await this.bookingRepo
      .createQueryBuilder()
      .update(BookingEntity)
      .set({ status: BookingStatus.COMPLETED, completedAt: now })
      .where('status = :status', { status: BookingStatus.CONFIRMED })
      .andWhere('end_time < :now', { now })
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(`Completed ${result.affected} CONFIRMED booking(s)`);
    }
  }

  /**
   * REQ-23.3 & 23.4: Send reminders (Payment & Booking).
   * Runs every 5 minutes (triggered by scheduler).
   */
  @Process({ name: 'send-reminders', concurrency: 1 })
  async sendReminders(_job: Job): Promise<void> {
    const now = new Date();

    // 1. PAYMENT_REMINDER: 10 mins before deadline
    // Find bookings PENDING_PAYMENT, where deadline is in next 10 mins and not yet reminded
    const tenMinsFromNow = new Date(now.getTime() + 10 * 60 * 1000);

    const pendingReminders = await this.bookingRepo.find({
      where: {
        status: BookingStatus.PENDING_PAYMENT,
        paymentDeadline: Between(now, tenMinsFromNow),
        paymentReminderSent: false,
      },
      relations: ['court'],
    });

    for (const booking of pendingReminders) {
      await this.notificationsService.create({
        userId: booking.userId!,
        type: NotificationType.PAYMENT_REMINDER,
        title: 'Payment Reminder',
        message: `Your booking reservation for ${booking.court?.name || ''} is expiring soon. Please complete your payment to secure your court.`,
        bookingId: booking.id,
      });
      booking.paymentReminderSent = true;
      await this.bookingRepo.save(booking);
    }

    // 2. BOOKING_REMINDER: 1 hour before start
    // Find bookings CONFIRMED, where start time is in next 1 hour and not yet reminded
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    const upcomingBookings = await this.bookingRepo.find({
      where: {
        status: BookingStatus.CONFIRMED,
        startTime: Between(now, oneHourFromNow),
        bookingReminderSent: false,
      },
      relations: ['court'],
    });

    for (const booking of upcomingBookings) {
      const startTimeStr = new Date(booking.startTime).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
      await this.notificationsService.create({
        userId: booking.userId!,
        type: NotificationType.BOOKING_REMINDER,
        title: 'Playtime Reminder',
        message: `You have an upcoming booking at ${booking.court?.name || ''} at ${startTimeStr}. Enjoy your match!`,
        bookingId: booking.id,
      });
      booking.bookingReminderSent = true;
      await this.bookingRepo.save(booking);
    }

    if (pendingReminders.length > 0 || upcomingBookings.length > 0) {
      this.logger.log(
        `Sent ${pendingReminders.length} payment reminders and ${upcomingBookings.length} booking reminders`,
      );
    }
  }
}
