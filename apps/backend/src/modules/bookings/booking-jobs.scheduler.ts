import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import Redis from 'ioredis';
import { ConfigType } from '@nestjs/config';
import bookingConfig from '../../config/booking.config';

/**
 * Schedules recurring booking lifecycle jobs via Bull Queue.
 * - expire-pending: runs every 1 minute (REQ-17.6)
 * - complete-confirmed: runs every 5 minutes (REQ-16.5)
 */
@Injectable()
export class BookingJobsScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(BookingJobsScheduler.name);
  private readonly schedulerLockKey = 'scheduler:booking-jobs:init';

  constructor(
    @InjectQueue('booking-jobs') private readonly bookingQueue: Queue,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    @Inject(bookingConfig.KEY)
    private readonly bookingCfg: ConfigType<typeof bookingConfig>,
  ) {}

  private async registerRepeatableJob(name: string, cron: string, jobId: string): Promise<void> {
    await this.bookingQueue.add(
      name,
      {},
      {
        jobId,
        repeat: { cron },
        removeOnComplete: true,
        removeOnFail: 20,
      },
    );
  }

  private async tryAcquireSchedulerLock(lockValue: string): Promise<boolean> {
    try {
      const acquired = await this.redis.set(
        this.schedulerLockKey,
        lockValue,
        'PX',
        this.bookingCfg.schedulerInitLockTtlMs,
        'NX',
      );
      return acquired === 'OK';
    } catch (error) {
      this.logger.warn(
        'Unable to acquire booking scheduler bootstrap lock; skipping scheduler init',
      );
      return false;
    }
  }

  private async releaseSchedulerLock(lockValue: string): Promise<void> {
    try {
      const currentValue = await this.redis.get(this.schedulerLockKey);
      if (currentValue === lockValue) {
        await this.redis.del(this.schedulerLockKey);
      }
    } catch {
      this.logger.warn('Unable to release booking scheduler bootstrap lock cleanly');
    }
  }

  async onApplicationBootstrap() {
    if (!this.bookingCfg.schedulerEnabled) {
      this.logger.log('Booking job scheduler disabled by configuration');
      return;
    }

    const lockValue = `${process.pid}:${Date.now()}`;
    const acquired = await this.tryAcquireSchedulerLock(lockValue);

    if (!acquired) {
      this.logger.log(
        'Booking job scheduler bootstrap skipped because another instance is initializing jobs',
      );
      return;
    }

    try {
      await this.registerRepeatableJob(
        'expire-pending',
        '*/1 * * * *',
        'booking-jobs:expire-pending',
      );
      await this.registerRepeatableJob(
        'complete-confirmed',
        '*/5 * * * *',
        'booking-jobs:complete-confirmed',
      );
      await this.registerRepeatableJob(
        'send-reminders',
        '*/5 * * * *',
        'booking-jobs:send-reminders',
      );
      this.logger.log('Booking lifecycle and reminder jobs scheduled');
    } catch (error) {
      this.logger.error('Booking job scheduler initialization failed', error as Error);
    } finally {
      await this.releaseSchedulerLock(lockValue);
    }
  }
}
