import { Processor, Process, InjectQueue } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import { BookingStatus } from '@court-booking/shared';

@Processor('booking-jobs')
export class BookingJobsProcessor {
  private readonly logger = new Logger(BookingJobsProcessor.name);

  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
  ) {}

  /**
   * REQ-17.6: Auto-expire PENDING_PAYMENT bookings past their deadline.
   * Runs every 1 minute via the queue scheduler.
   */
  @Process({ name: 'expire-pending', concurrency: 1 })
  async expirePendingBookings(_job: Job): Promise<void> {
    const now = new Date();

    const result = await this.bookingRepo
      .createQueryBuilder()
      .update(BookingEntity)
      .set({ status: BookingStatus.EXPIRED, expiredAt: now })
      .where('status = :status', { status: BookingStatus.PENDING_PAYMENT })
      .andWhere('payment_deadline < :now', { now })
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(`Expired ${result.affected} PENDING_PAYMENT booking(s)`);
    }
  }

  /**
   * REQ-16.5: Auto-complete CONFIRMED bookings past their end_time.
   * Runs every 5 minutes via the queue scheduler.
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
}
