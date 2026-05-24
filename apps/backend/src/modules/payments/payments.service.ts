import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, LessThan, Repository } from 'typeorm';
import { BookingStatus } from '@court-booking/shared';
import { BookingEntity } from '../../database/entities/booking.entity';
import { PaymentEntity, PaymentStatus } from '../../database/entities/payment.entity';
import {
  PaymentEventDirection,
  PaymentEventEntity,
} from '../../database/entities/payment-event.entity';
import { PaymentProviderEntity } from '../../database/entities/payment-provider.entity';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentLookupDto } from './dto/payment-lookup.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import {
  PaymentProviderAdapter,
  PaymentProviderCode,
} from './providers/payment-provider.interface';
import { VNPayProvider } from './providers/vnpay.provider';
import { ConfigType } from '@nestjs/config';
import paymentsConfig from '../../config/payments.config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly providers: Record<PaymentProviderCode, PaymentProviderAdapter>;

  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: Repository<PaymentEntity>,
    @InjectRepository(PaymentProviderEntity)
    private readonly paymentProviderRepository: Repository<PaymentProviderEntity>,
    @InjectRepository(PaymentEventEntity)
    private readonly paymentEventRepository: Repository<PaymentEventEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    @Inject(paymentsConfig.KEY)
    private readonly paymentCfg: ConfigType<typeof paymentsConfig>,
    @InjectQueue('payment-jobs')
    private readonly paymentQueue: Queue,
    private readonly dataSource: DataSource,
    vnpayProvider: VNPayProvider,
  ) {
    this.providers = {
      VNPAY: vnpayProvider,
    };
  }

  async initiatePayment(payload: InitiatePaymentDto, initiatedBy: string, clientIp?: string) {
    this.ensurePaymentsEnabled();

    const enabledProviders = new Set(this.paymentCfg.providersEnabled);
    if (!enabledProviders.has(payload.provider)) {
      throw new BadRequestException(`Payment provider ${payload.provider} is disabled by config`);
    }

    const { payment, booking } = await this.dataSource.transaction(async (manager) => {
      const provider = await manager.findOne(PaymentProviderEntity, {
        where: { code: payload.provider },
      });
      if (!provider || !provider.isActive) {
        throw new BadRequestException(`Payment provider ${payload.provider} is not active`);
      }

      const booking = await manager.findOne(BookingEntity, {
        where: { id: payload.bookingId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!booking) throw new NotFoundException('Booking not found');
      if (booking.userId && booking.userId !== initiatedBy) {
        throw new BadRequestException('Booking does not belong to current user');
      }
      if (![BookingStatus.PENDING_PAYMENT].includes(booking.status)) {
        throw new BadRequestException(`Booking is not payable in state ${booking.status}`);
      }
      if (booking.paymentDeadline && booking.paymentDeadline < new Date()) {
        throw new BadRequestException('Booking payment deadline has expired');
      }
      if (booking.successfulPaymentId) {
        throw new BadRequestException('Booking already has successful payment');
      }

      const existingPending = await manager.findOne(PaymentEntity, {
        where: {
          bookingId: booking.id,
          providerCode: payload.provider,
          status: In([PaymentStatus.PENDING, PaymentStatus.PROCESSING, PaymentStatus.RECONCILING]),
        },
        order: { createdAt: 'DESC' },
      });
      if (existingPending) {
        throw new BadRequestException(
          `An active payment attempt already exists for this booking (${existingPending.status})`,
        );
      }

      const payment = await manager.save(
        PaymentEntity,
        manager.create(PaymentEntity, {
          bookingId: booking.id,
          providerCode: payload.provider,
          amount: Number(booking.totalPrice),
          currency: 'VND',
          status: PaymentStatus.PENDING,
          initiatedBy,
        }),
      );
      return { payment, booking };
    });

    try {
      const createResult = await this.providers[payload.provider].createPayment({
        paymentId: payment.id,
        bookingId: booking.id,
        amount: Number(payment.amount),
        currency: payment.currency,
        clientIp,
      });

      payment.providerOrderId = createResult.providerOrderId;
      payment.providerRaw = createResult.raw;
      await this.paymentRepository.save(payment);

      await this.paymentEventRepository.save(
        this.paymentEventRepository.create({
          paymentId: payment.id,
          eventType: 'INITIATE_OUT',
          direction: PaymentEventDirection.OUT,
          payload: createResult.raw,
        }),
      );

      return {
        paymentId: payment.id,
        provider: payment.providerCode,
        status: payment.status,
        paymentUrl: createResult.paymentUrl,
        providerOrderId: payment.providerOrderId,
      };
    } catch (error) {
      payment.status = PaymentStatus.FAILED;
      payment.completedAt = payment.completedAt ?? new Date();
      await this.paymentRepository.save(payment);
      await this.paymentEventRepository.save(
        this.paymentEventRepository.create({
          paymentId: payment.id,
          eventType: 'INITIATE_PROVIDER_FAIL',
          direction: PaymentEventDirection.OUT,
          payload: {
            message: error instanceof Error ? error.message : String(error),
          },
        }),
      );
      throw error;
    }
  }

  async getPaymentStatus(paymentId: string) {
    const payment = await this.paymentRepository.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    const booking = await this.bookingRepository.findOne({ where: { id: payment.bookingId } });
    return {
      paymentId: payment.id,
      paymentStatus: payment.status,
      bookingStatus: booking?.status ?? null,
      provider: payment.providerCode,
      amount: Number(payment.amount),
      currency: payment.currency,
      completedAt: payment.completedAt,
    };
  }

  async lookupPayment(query: PaymentLookupDto) {
    const payment = await this.paymentRepository.findOne({
      where: query.providerOrderId
        ? { providerOrderId: query.providerOrderId, providerCode: 'VNPAY' }
        : { providerTxnId: query.providerTxnId!, providerCode: 'VNPAY' },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    const booking = await this.bookingRepository.findOne({ where: { id: payment.bookingId } });
    const lastEvents = await this.paymentEventRepository.find({
      where: { paymentId: payment.id },
      order: { createdAt: 'DESC' },
      take: 5,
    });

    return {
      paymentId: payment.id,
      provider: payment.providerCode,
      providerOrderId: payment.providerOrderId,
      providerTxnId: payment.providerTxnId,
      paymentStatus: payment.status,
      bookingId: payment.bookingId,
      bookingStatus: booking?.status ?? null,
      amount: Number(payment.amount),
      currency: payment.currency,
      completedAt: payment.completedAt,
      lastEvents: lastEvents.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        direction: e.direction,
        isVerified: e.isVerified,
        createdAt: e.createdAt,
      })),
    };
  }

  async refund(paymentId: string, payload: RefundPaymentDto) {
    this.ensurePaymentsEnabled();

    const payment = await this.paymentRepository.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');

    const result = await this.providers[payment.providerCode as PaymentProviderCode].refund(
      {
        providerOrderId: payment.providerOrderId,
        providerTxnId: payment.providerTxnId,
        metadata: payment.providerRaw,
      },
      payload.amount,
    );

    if (result.status === 'REFUNDED') {
      payment.status = PaymentStatus.REFUNDED;
      payment.refundedAt = new Date();
      payment.refundAmount = Number(payment.amount);
    }
    if (result.status === 'PARTIAL_REFUND') {
      payment.status = PaymentStatus.PARTIAL_REFUND;
      payment.refundedAt = new Date();
      payment.refundAmount = payload.amount ?? null;
    }
    await this.paymentRepository.save(payment);

    await this.paymentEventRepository.save(
      this.paymentEventRepository.create({
        paymentId: payment.id,
        eventType: 'REFUND_OUT',
        direction: PaymentEventDirection.OUT,
        payload: result.raw,
      }),
    );

    return {
      paymentId: payment.id,
      status: payment.status,
      refundedAt: payment.refundedAt,
      refundAmount: payment.refundAmount,
    };
  }

  async handleWebhook(
    providerCode: PaymentProviderCode,
    payload: Record<string, unknown>,
    headers: Record<string, string>,
    ipAddress: string | null,
  ) {
    this.ensurePaymentsEnabled();

    const verification = await this.providers[providerCode].verifyWebhook(payload, headers);
    const providerOrderId = verification.providerOrderId;
    if (!providerOrderId) {
      throw new BadRequestException('Missing provider order id');
    }

    const txResult = await this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(PaymentEntity, {
        where: { providerCode, providerOrderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!payment) throw new NotFoundException('Payment not found for webhook');

      const incomingStatus = this.mapIncomingPaymentStatus(verification.paymentStatus);

      const lastWebhookEvent = await manager.findOne(PaymentEventEntity, {
        where: {
          paymentId: payment.id,
          eventType: 'WEBHOOK_IN',
          direction: PaymentEventDirection.IN,
        },
        order: { createdAt: 'DESC' },
      });
      if (
        this.isDuplicateWebhookEvent(lastWebhookEvent, payload, verification.verified) &&
        [PaymentStatus.SUCCESS, PaymentStatus.FAILED, PaymentStatus.CANCELLED].includes(
          payment.status,
        ) &&
        incomingStatus === payment.status
      ) {
        return { ok: true, paymentId: payment.id, status: payment.status };
      }

      await manager.save(
        PaymentEventEntity,
        manager.create(PaymentEventEntity, {
          paymentId: payment.id,
          eventType: 'WEBHOOK_IN',
          direction: PaymentEventDirection.IN,
          payload,
          isVerified: verification.verified,
          ipAddress,
        }),
      );

      if (!verification.verified) {
        throw new BadRequestException('Invalid signature');
      }

      if (verification.providerTxnId) {
        if (payment.providerTxnId && payment.providerTxnId !== verification.providerTxnId) {
          throw new BadRequestException('Provider transaction id mismatch');
        }
        payment.providerTxnId = verification.providerTxnId;
      }

      if (providerCode === 'VNPAY') {
        const payloadTmnCode = String(payload.vnp_TmnCode ?? '');
        if (!payloadTmnCode || payloadTmnCode !== this.paymentCfg.vnpay.tmnCode) {
          throw new BadRequestException('Invalid VNPay tmn code');
        }
        const payloadAmount = Number(payload.vnp_Amount ?? 0);
        const expectedAmount = Math.round(Number(payment.amount) * 100);
        if (!Number.isFinite(payloadAmount) || payloadAmount <= 0) {
          throw new BadRequestException('Missing or invalid VNPay amount');
        }
        if (payment.currency !== 'VND') {
          throw new BadRequestException('Invalid payment currency for VNPay');
        }
        if (payloadAmount !== expectedAmount) {
          throw new BadRequestException('VNPay amount mismatch');
        }
      }

      // Idempotent terminal handling: if already terminal and incoming status is same, acknowledge.
      if (
        [PaymentStatus.SUCCESS, PaymentStatus.FAILED, PaymentStatus.CANCELLED].includes(
          payment.status,
        )
      ) {
        if (incomingStatus !== payment.status && incomingStatus !== PaymentStatus.PROCESSING) {
          payment.status = PaymentStatus.RECONCILING;
          await manager.save(payment);
        }
        return { ok: true, paymentId: payment.id, status: payment.status };
      }

      if (incomingStatus === PaymentStatus.SUCCESS) {
        payment.status = PaymentStatus.SUCCESS;
        payment.completedAt = new Date();
      } else if (incomingStatus === PaymentStatus.FAILED) {
        payment.status = PaymentStatus.FAILED;
        payment.completedAt = new Date();
      } else if (incomingStatus === PaymentStatus.CANCELLED) {
        payment.status = PaymentStatus.CANCELLED;
        payment.completedAt = new Date();
      } else {
        payment.status = PaymentStatus.PROCESSING;
      }

      await manager.save(payment);

      if (payment.status === PaymentStatus.SUCCESS) {
        await this.convergeBookingForSuccessfulPayment(manager, payment);
      }

      return { ok: true, paymentId: payment.id, status: payment.status };
    });

    if (txResult.status === PaymentStatus.RECONCILING) {
      await this.enqueueReconcile(txResult.paymentId);
    }
    return txResult;
  }

  async enqueueReconcile(paymentId: string) {
    await this.paymentQueue.add(
      'reconcile-payment',
      { paymentId },
      {
        removeOnComplete: true,
        removeOnFail: 20,
        attempts: 10,
        backoff: { type: 'exponential', delay: 30000 },
      },
    );
  }

  async reconcileStalePayments() {
    const stale = new Date(Date.now() - this.paymentCfg.reconcileStaleMinutes * 60_000);
    const pending = await this.paymentRepository.find({
      where: [
        { status: PaymentStatus.PENDING, initiatedAt: LessThan(stale) },
        { status: PaymentStatus.PROCESSING, initiatedAt: LessThan(stale) },
        { status: PaymentStatus.RECONCILING, updatedAt: LessThan(stale) },
      ],
      select: { id: true },
      take: 200,
    });
    for (const item of pending) {
      await this.enqueueReconcile(item.id);
    }
    if (pending.length > 0) {
      this.logger.log(`Queued ${pending.length} payment(s) for reconciliation`);
    }
  }

  async reconcilePayment(paymentId: string) {
    this.ensurePaymentsEnabled();

    const payment = await this.paymentRepository.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    const provider = this.providers[payment.providerCode as PaymentProviderCode];
    const query = await provider.queryPayment({
      providerOrderId: payment.providerOrderId,
      providerTxnId: payment.providerTxnId,
      metadata: payment.providerRaw,
    });

    await this.paymentEventRepository.save(
      this.paymentEventRepository.create({
        paymentId: payment.id,
        eventType: 'RECONCILE_OUT',
        direction: PaymentEventDirection.OUT,
        payload: query.raw,
      }),
    );

    const updated = await this.dataSource.transaction(async (manager) => {
      const lockedPayment = await manager.findOne(PaymentEntity, {
        where: { id: payment.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedPayment) throw new NotFoundException('Payment not found');

      if (query.providerTxnId) {
        lockedPayment.providerTxnId = query.providerTxnId;
      }
      if (query.paymentStatus === 'SUCCESS') {
        lockedPayment.status = PaymentStatus.SUCCESS;
        lockedPayment.completedAt = lockedPayment.completedAt ?? new Date();
      } else if (query.paymentStatus === 'FAILED') {
        lockedPayment.status = PaymentStatus.FAILED;
        lockedPayment.completedAt = lockedPayment.completedAt ?? new Date();
      } else if (query.paymentStatus === 'CANCELLED') {
        lockedPayment.status = PaymentStatus.CANCELLED;
        lockedPayment.completedAt = lockedPayment.completedAt ?? new Date();
      } else {
        lockedPayment.status = PaymentStatus.RECONCILING;
      }

      await manager.save(lockedPayment);

      if (lockedPayment.status === PaymentStatus.SUCCESS) {
        await this.convergeBookingForSuccessfulPayment(manager, lockedPayment);
      }

      return lockedPayment;
    });

    return { paymentId: updated.id, status: updated.status };
  }

  private async convergeBookingForSuccessfulPayment(
    manager: EntityManager,
    payment: PaymentEntity,
  ) {
    const booking = await manager.findOne(BookingEntity, {
      where: { id: payment.bookingId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!booking) {
      payment.status = PaymentStatus.RECONCILING;
      await manager.save(payment);
      return;
    }

    if (booking.status === BookingStatus.PENDING_PAYMENT) {
      booking.status = BookingStatus.CONFIRMED;
      booking.paidAt = booking.paidAt ?? new Date();
      booking.successfulPaymentId = payment.id;
      await manager.save(booking);
      return;
    }

    if (booking.status === BookingStatus.CONFIRMED) {
      if (!booking.successfulPaymentId) {
        booking.successfulPaymentId = payment.id;
        booking.paidAt = booking.paidAt ?? new Date();
        await manager.save(booking);
      }
      return;
    }

    // Financially successful payment but booking is not in convergable state.
    payment.status = PaymentStatus.RECONCILING;
    await manager.save(payment);
  }

  private mapIncomingPaymentStatus(
    status: 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'PROCESSING',
  ): PaymentStatus {
    if (status === 'SUCCESS') return PaymentStatus.SUCCESS;
    if (status === 'FAILED') return PaymentStatus.FAILED;
    if (status === 'CANCELLED') return PaymentStatus.CANCELLED;
    return PaymentStatus.PROCESSING;
  }

  private ensurePaymentsEnabled() {
    if (!this.paymentCfg.enabled) {
      throw new BadRequestException('Payments are disabled by configuration');
    }
  }

  private isDuplicateWebhookEvent(
    lastEvent: PaymentEventEntity | null,
    payload: Record<string, unknown>,
    verified: boolean,
  ): boolean {
    if (!lastEvent) return false;
    if (lastEvent.isVerified !== verified) return false;

    const lastPayload = lastEvent.payload || {};
    const fields = ['vnp_TxnRef', 'vnp_TransactionNo', 'vnp_ResponseCode', 'vnp_Amount'];
    return fields.every((f) => String(lastPayload[f] ?? '') === String(payload[f] ?? ''));
  }
}
