import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, LessThan, Repository } from 'typeorm';
import { BookingStatus, NotificationType } from '@court-booking/shared';
import { BookingEntity } from '../../database/entities/booking.entity';
import { PaymentEntity, PaymentStatus } from '../../database/entities/payment.entity';
import {
  PaymentEventDirection,
  PaymentEventEntity,
} from '../../database/entities/payment-event.entity';
import { PaymentProviderEntity } from '../../database/entities/payment-provider.entity';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { ManualReviewActionDto } from './dto/manual-review-action.dto';
import { ManualReviewListDto } from './dto/manual-review-list.dto';
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
import Redis from 'ioredis';
import { NotificationsService } from '../notifications/notifications.service';

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
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
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

    const { payment, booking, reusedAttempt } = await this.dataSource.transaction(
      async (manager) => {
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
            status: In([
              PaymentStatus.PENDING,
              PaymentStatus.PROCESSING,
              PaymentStatus.RECONCILING,
            ]),
          },
          order: { createdAt: 'DESC' },
        });
        if (existingPending) {
          if (existingPending.status === PaymentStatus.RECONCILING) {
            throw new BadRequestException(
              `An active payment attempt already exists for this booking (${existingPending.status})`,
            );
          }
          return { payment: existingPending, booking, reusedAttempt: true };
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
        return { payment, booking, reusedAttempt: false };
      },
    );

    try {
      const configuredReturnUrl = this.paymentCfg.vnpay.returnUrl;
      const returnUrl = configuredReturnUrl
        ? this.appendQueryParams(configuredReturnUrl, {
            bookingId: booking.id,
            paymentId: payment.id,
          })
        : undefined;
      const createResult = await this.providers[payload.provider].createPayment({
        paymentId: payment.id,
        bookingId: booking.id,
        amount: Number(payment.amount),
        currency: payment.currency,
        returnUrl,
        clientIp,
      });

      payment.providerOrderId = createResult.providerOrderId;
      payment.providerRaw = createResult.raw;
      await this.paymentRepository.save(payment);

      await this.paymentEventRepository.save(
        this.paymentEventRepository.create({
          paymentId: payment.id,
          eventType: reusedAttempt ? 'INITIATE_RETRY_OUT' : 'INITIATE_OUT',
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
    if (booking?.status === BookingStatus.CONFIRMED && !booking.successfulPaymentId) {
      this.logPaymentSignal('payment_data_mismatch_confirmed_booking_missing_successful_payment', {
        paymentId: payment.id,
        bookingId: booking.id,
      });
    }
    if (
      booking?.status === BookingStatus.CONFIRMED &&
      booking.successfulPaymentId &&
      booking.successfulPaymentId !== payment.id &&
      payment.status === PaymentStatus.SUCCESS
    ) {
      this.logPaymentSignal('payment_data_mismatch_confirmed_booking_successful_payment_mismatch', {
        paymentId: payment.id,
        bookingId: booking.id,
        successfulPaymentId: booking.successfulPaymentId,
      });
    }
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

  async listManualReviewPayments(query: ManualReviewListDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.paymentRepository
      .createQueryBuilder('payment')
      .innerJoin(
        PaymentEventEntity,
        'event',
        "event.paymentId = payment.id AND event.eventType = 'MANUAL_REVIEW_REQUIRED'",
      )
      .leftJoin(BookingEntity, 'booking', 'booking.id = payment.bookingId')
      .select([
        'payment.id as id',
        'payment.providerCode as providerCode',
        'payment.providerOrderId as providerOrderId',
        'payment.providerTxnId as providerTxnId',
        'payment.status as paymentStatus',
        'payment.amount as amount',
        'payment.currency as currency',
        'payment.bookingId as bookingId',
        'booking.status as bookingStatus',
        'event.createdAt as manualReviewAt',
        'event.payload as eventPayload',
      ])
      .orderBy('event.createdAt', 'DESC')
      .offset(skip)
      .limit(limit);

    if (query.status) {
      qb.andWhere('payment.status = :status', { status: query.status });
    }
    if (query.providerOrderId) {
      qb.andWhere('payment.providerOrderId ILIKE :providerOrderId', {
        providerOrderId: `%${query.providerOrderId}%`,
      });
    }
    if (query.dateFrom) {
      qb.andWhere('event.createdAt >= :dateFrom', { dateFrom: new Date(query.dateFrom) });
    }
    if (query.dateTo) {
      qb.andWhere('event.createdAt <= :dateTo', { dateTo: new Date(query.dateTo) });
    }

    const [rows, total] = await Promise.all([qb.getRawMany(), qb.getCount()]);
    const paymentIds = rows.map((row) => String(row.id));
    const [attemptRows, latestReconcileEvents] = paymentIds.length
      ? await Promise.all([
          this.paymentEventRepository
            .createQueryBuilder('evt')
            .select('evt.paymentId', 'paymentId')
            .addSelect('COUNT(*)', 'attemptCount')
            .where('evt.eventType = :eventType', { eventType: 'RECONCILE_OUT' })
            .andWhere('evt.paymentId IN (:...paymentIds)', { paymentIds })
            .groupBy('evt.paymentId')
            .getRawMany<{ paymentId: string; attemptCount: string }>(),
          this.paymentEventRepository
            .createQueryBuilder('evt')
            .where('evt.eventType = :eventType', { eventType: 'RECONCILE_OUT' })
            .andWhere('evt.paymentId IN (:...paymentIds)', { paymentIds })
            .orderBy('evt.createdAt', 'DESC')
            .getMany(),
        ])
      : [[], []];

    const attemptsByPaymentId = new Map<string, number>(
      attemptRows.map((r) => [r.paymentId, Number(r.attemptCount)]),
    );
    const latestReconcileByPaymentId = new Map<string, PaymentEventEntity>();
    for (const evt of latestReconcileEvents) {
      if (!latestReconcileByPaymentId.has(evt.paymentId)) {
        latestReconcileByPaymentId.set(evt.paymentId, evt);
      }
    }

    return {
      data: rows.map((row) => ({
        id: row.id,
        provider: row.providerCode,
        providerOrderId: row.providerOrderId,
        providerTxnId: row.providerTxnId,
        paymentStatus: row.paymentStatus,
        amount: Number(row.amount),
        currency: row.currency,
        bookingId: row.bookingId,
        bookingStatus: row.bookingStatus ?? null,
        manualReviewAt: row.manualReviewAt,
        reason:
          (row.eventPayload?.reason as string | undefined) ?? 'reconcile_max_attempts_exceeded',
        attemptCount: attemptsByPaymentId.get(String(row.id)) ?? 0,
        lastReconcileAt:
          latestReconcileByPaymentId.get(String(row.id))?.createdAt?.toISOString() ?? null,
        lastReconcileError:
          this.extractReconcileError(latestReconcileByPaymentId.get(String(row.id))?.payload) ??
          null,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async handleManualReviewAction(
    paymentId: string,
    action: ManualReviewActionDto,
    actedBy: string,
  ) {
    const payment = await this.paymentRepository.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');

    const manualReview = await this.paymentEventRepository.findOne({
      where: { paymentId, eventType: 'MANUAL_REVIEW_REQUIRED' },
      order: { createdAt: 'DESC' },
    });
    if (!manualReview) {
      throw new BadRequestException('Payment is not in manual review queue');
    }

    if (action.action === 'REQUEUE') {
      if (payment.status === PaymentStatus.RECONCILING) {
        await this.enqueueApplySuccessfulPayment(paymentId);
      } else {
        await this.enqueueReconcile(paymentId);
      }
      await this.paymentEventRepository.save(
        this.paymentEventRepository.create({
          paymentId,
          eventType: 'MANUAL_REVIEW_REQUEUED',
          direction: PaymentEventDirection.OUT,
          payload: {
            actedBy,
            note: action.note ?? null,
          },
        }),
      );
      return { paymentId, action: 'REQUEUE', queued: true };
    }

    await this.paymentEventRepository.save(
      this.paymentEventRepository.create({
        paymentId,
        eventType: 'MANUAL_REVIEW_RESOLVED',
        direction: PaymentEventDirection.OUT,
        payload: {
          actedBy,
          note: action.note ?? null,
        },
      }),
    );
    return { paymentId, action: 'RESOLVE', resolved: true };
  }

  async refund(paymentId: string, payload: RefundPaymentDto) {
    this.ensurePaymentsEnabled();

    const payment = await this.paymentRepository.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');

    if (![PaymentStatus.SUCCESS, PaymentStatus.PARTIAL_REFUND].includes(payment.status)) {
      throw new BadRequestException(
        `Payment is not refundable in state ${payment.status}. Expected SUCCESS/PARTIAL_REFUND.`,
      );
    }

    const totalAmount = Number(payment.amount);
    const alreadyRefunded = Number(payment.refundAmount ?? 0);
    const maxRefundable = Number((totalAmount - alreadyRefunded).toFixed(2));
    if (maxRefundable <= 0) {
      throw new BadRequestException('Payment has no refundable amount remaining.');
    }

    const requestedAmountFromPercent =
      payload.percent !== undefined
        ? Number(((maxRefundable * payload.percent) / 100).toFixed(2))
        : undefined;
    const requestedAmount = Number(
      (payload.amount ?? requestedAmountFromPercent ?? maxRefundable).toFixed(2),
    );
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      throw new BadRequestException('Refund amount must be greater than 0.');
    }
    if (requestedAmount > maxRefundable) {
      throw new BadRequestException(
        `Refund amount exceeds remaining refundable amount (${maxRefundable.toLocaleString('vi-VN')} VND).`,
      );
    }

    const result = await this.providers[payment.providerCode as PaymentProviderCode].refund(
      {
        providerOrderId: payment.providerOrderId,
        providerTxnId: payment.providerTxnId,
        metadata: payment.providerRaw,
      },
      requestedAmount,
    );

    if (result.status === 'FAILED') {
      await this.paymentEventRepository.save(
        this.paymentEventRepository.create({
          paymentId: payment.id,
          eventType: 'REFUND_OUT',
          direction: PaymentEventDirection.OUT,
          payload: result.raw,
        }),
      );
      throw new BadRequestException('Provider refund failed. Please reconcile or retry later.');
    }

    if (result.status === 'PROCESSING') {
      payment.providerRaw = {
        ...(payment.providerRaw ?? {}),
        refund: {
          status: 'PROCESSING',
          updatedAt: new Date().toISOString(),
        },
      };
      await this.paymentRepository.save(payment);
      await this.paymentEventRepository.save(
        this.paymentEventRepository.create({
          paymentId: payment.id,
          eventType: 'REFUND_OUT',
          direction: PaymentEventDirection.OUT,
          payload: result.raw,
        }),
      );
      await this.enqueueReconcile(payment.id);
      return {
        paymentId: payment.id,
        status: payment.status,
        refundedAt: payment.refundedAt,
        refundAmount: payment.refundAmount,
        processing: true,
      };
    }

    if (result.status === 'REFUNDED') {
      payment.status = PaymentStatus.REFUNDED;
      payment.refundedAt = new Date();
      payment.refundAmount = totalAmount;
      payment.providerRaw = {
        ...(payment.providerRaw ?? {}),
        refund: {
          status: 'REFUNDED',
          updatedAt: new Date().toISOString(),
        },
      };
    }
    if (result.status === 'PARTIAL_REFUND') {
      payment.status = PaymentStatus.PARTIAL_REFUND;
      payment.refundedAt = new Date();
      payment.refundAmount = Number((alreadyRefunded + requestedAmount).toFixed(2));
      payment.providerRaw = {
        ...(payment.providerRaw ?? {}),
        refund: {
          status: 'PARTIAL_REFUND',
          updatedAt: new Date().toISOString(),
        },
      };
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

    await this.sendRefundProcessedNotification(payment.bookingId, requestedAmount);

    return {
      paymentId: payment.id,
      status: payment.status,
      refundedAt: payment.refundedAt,
      refundAmount: payment.refundAmount,
    };
  }

  async refundByBooking(bookingId: string, payload: RefundPaymentDto) {
    const booking = await this.bookingRepository.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (![BookingStatus.CANCELLED, BookingStatus.EXPIRED].includes(booking.status)) {
      throw new BadRequestException(
        `Booking must be CANCELLED/EXPIRED before refund (current: ${booking.status})`,
      );
    }

    let paymentId = booking.successfulPaymentId ?? null;
    if (!paymentId) {
      const fallbackPayment = await this.paymentRepository.findOne({
        where: {
          bookingId: booking.id,
          status: In([
            PaymentStatus.SUCCESS,
            PaymentStatus.RECONCILING,
            PaymentStatus.PARTIAL_REFUND,
            PaymentStatus.REFUNDED,
          ]),
        },
        order: { createdAt: 'DESC' },
      });
      paymentId = fallbackPayment?.id ?? null;
    }

    if (!paymentId) {
      throw new BadRequestException(
        'Cannot refund booking without linked successful payment. Reconcile payment first.',
      );
    }

    return this.refund(paymentId, payload);
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
        return { ok: true, paymentId: payment.id, status: payment.status, bookingConfirmed: false };
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
      payment.providerRaw = {
        ...(payment.providerRaw ?? {}),
        ...(verification.raw ?? {}),
      };

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
        return { ok: true, paymentId: payment.id, status: payment.status, bookingConfirmed: false };
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

      const bookingConfirmed =
        payment.status === PaymentStatus.SUCCESS
          ? await this.convergeBookingForSuccessfulPayment(manager, payment)
          : false;

      return { ok: true, paymentId: payment.id, status: payment.status, bookingConfirmed };
    });

    if (txResult.bookingConfirmed) {
      await this.sendBookingConfirmedNotification(txResult.paymentId);
    }

    if (txResult.status === PaymentStatus.RECONCILING) {
      await this.enqueueApplySuccessfulPayment(txResult.paymentId);
      this.logPaymentSignal('payment_webhook_reconciling', {
        paymentId: txResult.paymentId,
        providerCode,
      });
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

  async enqueueApplySuccessfulPayment(paymentId: string) {
    await this.paymentQueue.add(
      'apply-successful-payment',
      { paymentId },
      {
        removeOnComplete: true,
        removeOnFail: 20,
        attempts: 10,
        backoff: { type: 'exponential', delay: 30000 },
      },
    );
  }

  async enqueueRefundOrphanSuccess(paymentId: string) {
    await this.paymentQueue.add(
      'refund-orphan-success',
      { paymentId },
      {
        removeOnComplete: true,
        removeOnFail: 20,
        attempts: 5,
        backoff: { type: 'exponential', delay: 60000 },
      },
    );
  }

  async reconcileStalePayments() {
    const stale = new Date(Date.now() - this.paymentCfg.reconcileStaleMinutes * 60_000);
    const orphanCutoff = new Date(Date.now() - this.paymentCfg.compensationOrphanMinutes * 60_000);
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
      const payment = await this.paymentRepository.findOne({
        where: { id: item.id },
        select: { status: true, updatedAt: true },
      });
      if (!payment) continue;

      const exceeded = await this.hasExceededReconcileAttempts(item.id);
      if (exceeded) {
        if (
          this.paymentCfg.compensationAutoRefundEnabled &&
          payment.status === PaymentStatus.RECONCILING &&
          payment.updatedAt < orphanCutoff
        ) {
          const skippedRecently = await this.hasRecentManualReviewReason(
            item.id,
            'orphan_refund_skipped_pending_booking',
          );
          if (skippedRecently) {
            this.logPaymentSignal('payment_compensation_orphan_refund_skipped_recently', {
              paymentId: item.id,
            });
            continue;
          }
          await this.enqueueRefundOrphanSuccess(item.id);
          this.logger.warn(
            `Queued orphan refund compensation for paymentId=${item.id} after reconcile attempts exceeded`,
          );
          this.logPaymentSignal('payment_compensation_orphan_refund_queued', {
            paymentId: item.id,
          });
          continue;
        }
        await this.markManualReviewRequired(item.id, 'reconcile_max_attempts_exceeded');
        continue;
      }
      if (payment.status === PaymentStatus.RECONCILING) {
        await this.enqueueApplySuccessfulPayment(item.id);
      } else {
        await this.enqueueReconcile(item.id);
      }
    }
    if (pending.length > 0) {
      this.logger.log(`Queued ${pending.length} payment(s) for reconciliation`);
      this.logPaymentSignal('payment_reconcile_batch_queued', { count: pending.length });
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

      const bookingConfirmed =
        lockedPayment.status === PaymentStatus.SUCCESS
          ? await this.convergeBookingForSuccessfulPayment(manager, lockedPayment)
          : false;

      return { payment: lockedPayment, bookingConfirmed };
    });

    if (updated.bookingConfirmed) {
      await this.sendBookingConfirmedNotification(updated.payment.id);
    }

    return { paymentId: updated.payment.id, status: updated.payment.status };
  }

  async applySuccessfulPayment(paymentId: string) {
    this.ensurePaymentsEnabled();

    const updated = await this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(PaymentEntity, {
        where: { id: paymentId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!payment) throw new NotFoundException('Payment not found');

      if (
        payment.status !== PaymentStatus.SUCCESS &&
        payment.status !== PaymentStatus.RECONCILING
      ) {
        return { payment, bookingConfirmed: false };
      }

      if (payment.status === PaymentStatus.RECONCILING) {
        payment.status = PaymentStatus.SUCCESS;
        payment.completedAt = payment.completedAt ?? new Date();
        await manager.save(payment);
      }

      const bookingConfirmed = await this.convergeBookingForSuccessfulPayment(manager, payment);
      return { payment, bookingConfirmed };
    });

    if (updated.bookingConfirmed) {
      await this.sendBookingConfirmedNotification(updated.payment.id);
    }

    return { paymentId: updated.payment.id, status: updated.payment.status };
  }

  async refundOrphanSuccess(paymentId: string) {
    this.ensurePaymentsEnabled();

    let shouldEnqueueApplySuccessful = false;
    let manualReviewReasonToMark: string | null = null;
    let logPendingBookingCompensation = false;

    const result = await this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(PaymentEntity, {
        where: { id: paymentId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!payment) throw new NotFoundException('Payment not found');

      if (![PaymentStatus.SUCCESS, PaymentStatus.RECONCILING].includes(payment.status)) {
        return { paymentId: payment.id, status: payment.status, skipped: true };
      }

      const booking = await manager.findOne(BookingEntity, {
        where: { id: payment.bookingId },
        lock: { mode: 'pessimistic_write' },
      });
      const canKeepPaymentAsSuccess = booking && booking.status === BookingStatus.CONFIRMED;
      if (canKeepPaymentAsSuccess) {
        return { paymentId: payment.id, status: payment.status, skipped: true };
      }

      if (booking?.status === BookingStatus.PENDING_PAYMENT) {
        shouldEnqueueApplySuccessful = true;
        manualReviewReasonToMark = 'orphan_refund_skipped_pending_booking';
        logPendingBookingCompensation = true;
        return {
          paymentId: payment.id,
          status: payment.status,
          skipped: true,
          requeuedApplySuccessful: true,
        };
      }

      const provider = this.providers[payment.providerCode as PaymentProviderCode];
      const refund = await provider.refund({
        providerOrderId: payment.providerOrderId,
        providerTxnId: payment.providerTxnId,
        metadata: payment.providerRaw,
      });

      await manager.save(
        PaymentEventEntity,
        manager.create(PaymentEventEntity, {
          paymentId: payment.id,
          eventType: 'REFUND_ORPHAN_OUT',
          direction: PaymentEventDirection.OUT,
          payload: refund.raw,
        }),
      );

      if (refund.status === 'FAILED') {
        const cooldownCutoff = new Date(
          Date.now() - this.paymentCfg.manualReviewCooldownMinutes * 60_000,
        );
        const duplicatedManualReview = await manager
          .createQueryBuilder(PaymentEventEntity, 'evt')
          .where('evt.paymentId = :paymentId', { paymentId: payment.id })
          .andWhere("evt.eventType = 'MANUAL_REVIEW_REQUIRED'")
          .andWhere("evt.payload->>'reason' = :reason", { reason: 'orphan_refund_failed' })
          .andWhere('evt.createdAt >= :cutoff', { cutoff: cooldownCutoff })
          .getOne();

        if (!duplicatedManualReview) {
          await manager.save(
            PaymentEventEntity,
            manager.create(PaymentEventEntity, {
              paymentId: payment.id,
              eventType: 'MANUAL_REVIEW_REQUIRED',
              direction: PaymentEventDirection.OUT,
              payload: {
                reason: 'orphan_refund_failed',
                note: 'Auto-refund failed for orphan successful payment',
                cooldownMinutes: this.paymentCfg.manualReviewCooldownMinutes,
              },
            }),
          );
        }
        return { paymentId: payment.id, status: payment.status, refundFailed: true };
      }

      payment.status =
        refund.status === 'PARTIAL_REFUND' ? PaymentStatus.PARTIAL_REFUND : PaymentStatus.REFUNDED;
      payment.refundedAt = new Date();
      payment.refundAmount = refund.status === 'PARTIAL_REFUND' ? null : Number(payment.amount);
      await manager.save(payment);

      this.logger.warn(
        `Payment compensation applied: orphan successful payment refunded paymentId=${payment.id}`,
      );
      this.logPaymentSignal('payment_compensation_orphan_refunded', {
        paymentId: payment.id,
        providerCode: payment.providerCode,
      });
      return { paymentId: payment.id, status: payment.status };
    });

    if (shouldEnqueueApplySuccessful) {
      await this.enqueueApplySuccessfulPayment(paymentId);
    }
    if (manualReviewReasonToMark) {
      await this.markManualReviewRequired(paymentId, manualReviewReasonToMark);
    }
    if (logPendingBookingCompensation) {
      this.logPaymentSignal('payment_compensation_orphan_skipped_pending_booking', {
        paymentId,
      });
    }

    return result;
  }

  async markTestRefundSuccess(paymentId: string, amount?: number) {
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('Test refund hook is disabled in production');
    }

    const payment = await this.paymentRepository.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');

    const totalAmount = Number(payment.amount);
    const requestedAmount = Number((amount ?? totalAmount).toFixed(2));
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      throw new BadRequestException('Refund amount must be greater than 0.');
    }
    if (requestedAmount > totalAmount) {
      throw new BadRequestException(
        `Refund amount exceeds payment amount (${totalAmount.toLocaleString('vi-VN')} VND).`,
      );
    }

    const fullRefund = requestedAmount >= totalAmount;
    payment.status = fullRefund ? PaymentStatus.REFUNDED : PaymentStatus.PARTIAL_REFUND;
    payment.refundedAt = new Date();
    payment.refundAmount = fullRefund
      ? totalAmount
      : Number((Number(payment.refundAmount ?? 0) + requestedAmount).toFixed(2));
    payment.providerRaw = {
      ...(payment.providerRaw ?? {}),
      refund: {
        status: fullRefund ? 'REFUNDED' : 'PARTIAL_REFUND',
        source: 'TEST_HOOK',
        updatedAt: new Date().toISOString(),
      },
    };
    await this.paymentRepository.save(payment);
    await this.paymentEventRepository.save(
      this.paymentEventRepository.create({
        paymentId: payment.id,
        eventType: 'REFUND_OUT',
        direction: PaymentEventDirection.OUT,
        payload: {
          source: 'TEST_HOOK',
          amount: requestedAmount,
          status: payment.status,
        },
      }),
    );

    await this.sendRefundProcessedNotification(payment.bookingId, requestedAmount);

    return {
      paymentId: payment.id,
      status: payment.status,
      refundedAt: payment.refundedAt,
      refundAmount: payment.refundAmount,
      source: 'TEST_HOOK',
    };
  }

  private async convergeBookingForSuccessfulPayment(
    manager: EntityManager,
    payment: PaymentEntity,
  ): Promise<boolean> {
    const booking = await manager.findOne(BookingEntity, {
      where: { id: payment.bookingId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!booking) {
      payment.status = PaymentStatus.RECONCILING;
      await manager.save(payment);
      return false;
    }

    if (booking.status === BookingStatus.PENDING_PAYMENT) {
      booking.status = BookingStatus.CONFIRMED;
      booking.paidAt = booking.paidAt ?? new Date();
      booking.successfulPaymentId = payment.id;
      await manager.save(booking);
      return true;
    }

    if (booking.status === BookingStatus.CONFIRMED) {
      if (!booking.successfulPaymentId) {
        this.logPaymentSignal('payment_guardrail_backfill_successful_payment_id', {
          bookingId: booking.id,
          paymentId: payment.id,
        });
        booking.successfulPaymentId = payment.id;
        booking.paidAt = booking.paidAt ?? new Date();
        await manager.save(booking);
      }
      return false;
    }

    // Financially successful payment but booking is not in convergable state.
    payment.status = PaymentStatus.RECONCILING;
    await manager.save(payment);
    return false;
  }

  private async sendBookingConfirmedNotification(paymentId: string): Promise<void> {
    try {
      const payment = await this.paymentRepository.findOne({ where: { id: paymentId } });
      if (!payment) return;

      const booking = await this.bookingRepository.findOne({
        where: { id: payment.bookingId },
        relations: ['court'],
      });
      if (!booking?.userId) return;

      const start = new Date(booking.startTime);
      const startTimeStr = start.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const startDateStr = start.toLocaleDateString('vi-VN');

      await this.notificationsService.create({
        userId: booking.userId,
        type: NotificationType.BOOKING_CONFIRMED,
        title: 'Booking Confirmed',
        message: `You have successfully booked ${booking.court?.name || 'your court'} at ${startTimeStr} on ${startDateStr}.`,
        bookingId: booking.id,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to send booking confirmed notification for paymentId=${paymentId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async sendRefundProcessedNotification(
    bookingId: string,
    refundAmount: number,
  ): Promise<void> {
    try {
      const booking = await this.bookingRepository.findOne({
        where: { id: bookingId },
        relations: ['court'],
      });
      if (!booking?.userId) return;

      await this.notificationsService.create({
        userId: booking.userId,
        type: NotificationType.REFUND_PROCESSED,
        title: 'Refund processed',
        message: `A refund of ${Number(refundAmount || 0).toLocaleString('vi-VN')} VND for your booking at ${booking.court?.name || 'your court'} has been processed.`,
        bookingId,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to send refund notification for bookingId=${bookingId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
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

  private extractReconcileError(
    payload: Record<string, unknown> | null | undefined,
  ): string | undefined {
    if (!payload) return undefined;
    const msg = payload.message;
    if (typeof msg === 'string' && msg.trim()) return msg;
    const note = payload.note;
    if (typeof note === 'string' && note.trim()) return note;
    return undefined;
  }

  private async hasExceededReconcileAttempts(paymentId: string): Promise<boolean> {
    const attemptCount = await this.paymentEventRepository.count({
      where: {
        paymentId,
        eventType: 'RECONCILE_OUT',
      },
    });
    return attemptCount >= this.paymentCfg.reconcileMaxAttempts;
  }

  private async markManualReviewRequired(paymentId: string, reason: string): Promise<void> {
    const acquired = await this.tryAcquireManualReviewDedupeLock(paymentId, reason);
    if (!acquired) return;

    const cutoff = new Date(Date.now() - this.paymentCfg.manualReviewCooldownMinutes * 60_000);
    const exists = await this.paymentEventRepository
      .createQueryBuilder('evt')
      .where('evt.paymentId = :paymentId', { paymentId })
      .andWhere("evt.eventType = 'MANUAL_REVIEW_REQUIRED'")
      .andWhere("evt.payload->>'reason' = :reason", { reason })
      .andWhere('evt.createdAt >= :cutoff', { cutoff })
      .orderBy('evt.createdAt', 'DESC')
      .getOne();
    if (exists) return;

    await this.paymentEventRepository.save(
      this.paymentEventRepository.create({
        paymentId,
        eventType: 'MANUAL_REVIEW_REQUIRED',
        direction: PaymentEventDirection.OUT,
        payload: {
          reason,
          maxAttempts: this.paymentCfg.reconcileMaxAttempts,
          cooldownMinutes: this.paymentCfg.manualReviewCooldownMinutes,
        },
      }),
    );
    this.logPaymentSignal('payment_manual_review_required', { paymentId, reason });
  }

  private async hasRecentManualReviewReason(paymentId: string, reason: string): Promise<boolean> {
    const cutoff = new Date(Date.now() - this.paymentCfg.manualReviewCooldownMinutes * 60_000);
    const found = await this.paymentEventRepository
      .createQueryBuilder('evt')
      .where('evt.paymentId = :paymentId', { paymentId })
      .andWhere("evt.eventType = 'MANUAL_REVIEW_REQUIRED'")
      .andWhere("evt.payload->>'reason' = :reason", { reason })
      .andWhere('evt.createdAt >= :cutoff', { cutoff })
      .getOne();
    return Boolean(found);
  }

  private async tryAcquireManualReviewDedupeLock(
    paymentId: string,
    reason: string,
  ): Promise<boolean> {
    const ttlMs = Math.max(60_000, this.paymentCfg.manualReviewCooldownMinutes * 60_000);
    const key = `payments:manual-review:${paymentId}:${reason}`;
    try {
      const setResult = await this.redis.set(key, '1', 'PX', ttlMs, 'NX');
      return setResult === 'OK';
    } catch (error) {
      this.logger.warn(
        `Manual review dedupe lock fallback for paymentId=${paymentId}, reason=${reason}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      // On Redis issue, fallback to DB-based dedupe only.
      return true;
    }
  }

  private logPaymentSignal(event: string, data: Record<string, unknown>) {
    this.logger.log(JSON.stringify({ event, ...data }));
  }

  private appendQueryParams(baseUrl: string, params: Record<string, string>): string {
    const url = new URL(baseUrl);
    for (const [key, value] of Object.entries(params)) {
      if (!url.searchParams.has(key)) {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  }
}
