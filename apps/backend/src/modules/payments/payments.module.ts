import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import { PaymentEventEntity } from '../../database/entities/payment-event.entity';
import { PaymentProviderEntity } from '../../database/entities/payment-provider.entity';
import { PaymentEntity } from '../../database/entities/payment.entity';
import { PaymentJobsProcessor } from './payment-jobs.processor';
import { PaymentJobsScheduler } from './payment-jobs.scheduler';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { VNPayProvider } from './providers/vnpay.provider';
import { VNPayWebhookController } from './webhooks/vnpay-webhook.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingEntity,
      PaymentEntity,
      PaymentProviderEntity,
      PaymentEventEntity,
    ]),
    BullModule.registerQueue({ name: 'payment-jobs' }),
  ],
  controllers: [PaymentsController, VNPayWebhookController],
  providers: [PaymentsService, VNPayProvider, PaymentJobsProcessor, PaymentJobsScheduler],
  exports: [PaymentsService],
})
export class PaymentsModule {}
