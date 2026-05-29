import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import Redis from 'ioredis';
import { ConfigType } from '@nestjs/config';
import paymentsConfig from '../../config/payments.config';

@Injectable()
export class PaymentJobsScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(PaymentJobsScheduler.name);
  private readonly schedulerLockKey = 'scheduler:payment-jobs:init';

  constructor(
    @InjectQueue('payment-jobs') private readonly paymentQueue: Queue,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    @Inject(paymentsConfig.KEY)
    private readonly paymentCfg: ConfigType<typeof paymentsConfig>,
  ) {}

  private async tryAcquireSchedulerLock(lockValue: string): Promise<boolean> {
    try {
      const acquired = await this.redis.set(
        this.schedulerLockKey,
        lockValue,
        'PX',
        this.paymentCfg.schedulerInitLockTtlMs,
        'NX',
      );
      return acquired === 'OK';
    } catch {
      this.logger.warn(
        'Unable to acquire payment scheduler bootstrap lock; skipping scheduler init',
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
      this.logger.warn('Unable to release payment scheduler bootstrap lock cleanly');
    }
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!this.paymentCfg.schedulerEnabled) {
      this.logger.log('Payment job scheduler disabled by configuration');
      return;
    }

    const lockValue = `${process.pid}:${Date.now()}`;
    const acquired = await this.tryAcquireSchedulerLock(lockValue);
    if (!acquired) {
      this.logger.log(
        'Payment job scheduler bootstrap skipped because another instance is initializing jobs',
      );
      return;
    }

    try {
      const everyMinutes = Math.max(1, this.paymentCfg.reconcileIntervalMinutes || 5);
      const cron = `*/${everyMinutes} * * * *`;
      await this.paymentQueue.add(
        'scan-stale-payments',
        {},
        {
          jobId: 'payment-jobs:scan-stale-payments',
          repeat: { cron },
          removeOnComplete: true,
          removeOnFail: 20,
        },
      );
      this.logger.log(`Payment reconciliation scheduler initialized with cron "${cron}"`);
    } catch (error) {
      this.logger.error('Payment job scheduler initialization failed', error as Error);
    } finally {
      await this.releaseSchedulerLock(lockValue);
    }
  }
}
