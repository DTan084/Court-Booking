import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

/**
 * Schedules recurring booking lifecycle jobs via Bull Queue.
 * - expire-pending: runs every 1 minute (REQ-17.6)
 * - complete-confirmed: runs every 5 minutes (REQ-16.5)
 */
@Injectable()
export class BookingJobsScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(BookingJobsScheduler.name);

  constructor(@InjectQueue('booking-jobs') private readonly bookingQueue: Queue) {}

  async onApplicationBootstrap() {
    // Remove existing repeatable jobs to avoid duplicates on restart
    const repeatableJobs = await this.bookingQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await this.bookingQueue.removeRepeatableByKey(job.key);
    }

    // Schedule: expire PENDING_PAYMENT every 1 minute
    await this.bookingQueue.add(
      'expire-pending',
      {},
      { repeat: { cron: '*/1 * * * *' }, removeOnComplete: true, removeOnFail: false },
    );

    // Schedule: complete CONFIRMED every 5 minutes
    await this.bookingQueue.add(
      'complete-confirmed',
      {},
      { repeat: { cron: '*/5 * * * *' }, removeOnComplete: true, removeOnFail: false },
    );

    this.logger.log('Booking lifecycle jobs scheduled');
  }
}
