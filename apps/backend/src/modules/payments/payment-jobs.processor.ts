import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PaymentsService } from './payments.service';

type ReconcilePaymentJob = { paymentId: string };
type ApplySuccessfulPaymentJob = { paymentId: string };
type RefundOrphanSuccessJob = { paymentId: string };

@Injectable()
@Processor('payment-jobs')
export class PaymentJobsProcessor {
  private readonly logger = new Logger(PaymentJobsProcessor.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Process({ name: 'scan-stale-payments', concurrency: 1 })
  async scanStalePayments(_job: Job): Promise<void> {
    await this.paymentsService.reconcileStalePayments();
  }

  @Process({ name: 'reconcile-payment', concurrency: 5 })
  async reconcilePayment(job: Job<ReconcilePaymentJob>): Promise<void> {
    try {
      await this.paymentsService.reconcilePayment(job.data.paymentId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Reconcile payment job failed for paymentId=${job.data.paymentId}: ${message}`,
      );
      throw error;
    }
  }

  @Process({ name: 'apply-successful-payment', concurrency: 5 })
  async applySuccessfulPayment(job: Job<ApplySuccessfulPaymentJob>): Promise<void> {
    try {
      await this.paymentsService.applySuccessfulPayment(job.data.paymentId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Apply successful payment job failed for paymentId=${job.data.paymentId}: ${message}`,
      );
      throw error;
    }
  }

  @Process({ name: 'refund-orphan-success', concurrency: 3 })
  async refundOrphanSuccess(job: Job<RefundOrphanSuccessJob>): Promise<void> {
    try {
      await this.paymentsService.refundOrphanSuccess(job.data.paymentId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Refund orphan payment job failed for paymentId=${job.data.paymentId}: ${message}`,
      );
      throw error;
    }
  }
}
