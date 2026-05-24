import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { DataSource } from 'typeorm';
import { BookingStatus } from '@court-booking/shared';
import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentEntity, PaymentStatus } from '../../database/entities/payment.entity';
import { PaymentProviderEntity } from '../../database/entities/payment-provider.entity';
import { PaymentEventEntity } from '../../database/entities/payment-event.entity';
import { BookingEntity } from '../../database/entities/booking.entity';
import paymentsConfig from '../../config/payments.config';
import { VNPayProvider } from './providers/vnpay.provider';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentRepository: any;
  let dataSource: any;

  const mockPaymentRepo = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn((v) => v),
    createQueryBuilder: jest.fn(),
  });

  const mockGenericRepo = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    save: jest.fn(),
    create: jest.fn((v) => v),
    createQueryBuilder: jest.fn(),
  });

  const mockQueue = () => ({
    add: jest.fn(),
  });

  const mockDataSource = () => ({
    transaction: jest.fn(),
  });

  const mockProvider = () => ({
    code: 'VNPAY',
    createPayment: jest.fn(),
    verifyWebhook: jest.fn(),
    queryPayment: jest.fn(),
    refund: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(PaymentEntity), useFactory: mockPaymentRepo },
        { provide: getRepositoryToken(PaymentProviderEntity), useFactory: mockGenericRepo },
        { provide: getRepositoryToken(PaymentEventEntity), useFactory: mockGenericRepo },
        { provide: getRepositoryToken(BookingEntity), useFactory: mockGenericRepo },
        {
          provide: paymentsConfig.KEY,
          useValue: {
            enabled: true,
            providersEnabled: ['VNPAY'],
            reconcileStaleMinutes: 10,
            reconcileMaxAttempts: 2,
            compensationAutoRefundEnabled: false,
            compensationOrphanMinutes: 30,
            vnpay: { tmnCode: 'TESTCODE' },
          },
        },
        { provide: getQueueToken('payment-jobs'), useFactory: mockQueue },
        { provide: DataSource, useFactory: mockDataSource },
        { provide: VNPayProvider, useFactory: mockProvider },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    paymentRepository = module.get(getRepositoryToken(PaymentEntity));
    dataSource = module.get(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('reconcilePayment', () => {
    it('converges booking to CONFIRMED when provider returns SUCCESS', async () => {
      const payment = {
        id: 'payment-1',
        bookingId: 'booking-1',
        providerCode: 'VNPAY',
        providerOrderId: 'VNPAY-payment-1',
        providerTxnId: null,
        status: PaymentStatus.PENDING,
        completedAt: null,
      } as PaymentEntity;
      const booking = {
        id: 'booking-1',
        status: BookingStatus.PENDING_PAYMENT,
        paidAt: null,
        successfulPaymentId: null,
      } as BookingEntity;

      paymentRepository.findOne.mockResolvedValue(payment);
      (service as any).providers.VNPAY.queryPayment.mockResolvedValue({
        paymentStatus: 'SUCCESS',
        providerTxnId: 'txn-1',
        raw: { ok: true },
      });

      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          findOne: jest
            .fn()
            .mockImplementation((entity: unknown) =>
              entity === PaymentEntity ? Promise.resolve(payment) : Promise.resolve(booking),
            ),
          save: jest.fn().mockImplementation((entity: any) => Promise.resolve(entity)),
        };
        return cb(manager);
      });

      const result = await service.reconcilePayment(payment.id);

      expect(result.status).toBe(PaymentStatus.SUCCESS);
      expect(booking.status).toBe(BookingStatus.CONFIRMED);
      expect(booking.successfulPaymentId).toBe(payment.id);
      expect(payment.providerTxnId).toBe('txn-1');
    });

    it('marks payment as RECONCILING when booking is not convergable', async () => {
      const payment = {
        id: 'payment-2',
        bookingId: 'booking-2',
        providerCode: 'VNPAY',
        providerOrderId: 'VNPAY-payment-2',
        status: PaymentStatus.PROCESSING,
        completedAt: null,
      } as PaymentEntity;
      const booking = {
        id: 'booking-2',
        status: BookingStatus.CANCELLED,
        successfulPaymentId: null,
      } as BookingEntity;

      paymentRepository.findOne.mockResolvedValue(payment);
      (service as any).providers.VNPAY.queryPayment.mockResolvedValue({
        paymentStatus: 'SUCCESS',
        raw: { ok: true },
      });

      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          findOne: jest
            .fn()
            .mockImplementation((entity: unknown) =>
              entity === PaymentEntity ? Promise.resolve(payment) : Promise.resolve(booking),
            ),
          save: jest.fn().mockImplementation((entity: any) => Promise.resolve(entity)),
        };
        return cb(manager);
      });

      const result = await service.reconcilePayment(payment.id);

      expect(result.status).toBe(PaymentStatus.RECONCILING);
      expect(payment.status).toBe(PaymentStatus.RECONCILING);
    });
  });

  describe('handleWebhook', () => {
    it('rejects VNPay webhook when amount does not match payment amount', async () => {
      const payment = {
        id: 'payment-3',
        bookingId: 'booking-3',
        providerCode: 'VNPAY',
        providerOrderId: 'VNPAY-payment-3',
        providerTxnId: null,
        amount: 100000, // expect vnp_Amount = 10000000
        currency: 'VND',
        status: PaymentStatus.PENDING,
      } as PaymentEntity;

      (service as any).providers.VNPAY.verifyWebhook.mockResolvedValue({
        verified: true,
        paymentStatus: 'SUCCESS',
        providerOrderId: 'VNPAY-payment-3',
        providerTxnId: 'txn-3',
        raw: {},
      });

      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          findOne: jest
            .fn()
            .mockImplementation((entity: unknown) =>
              entity === PaymentEntity ? Promise.resolve(payment) : Promise.resolve(null),
            ),
          save: jest.fn().mockImplementation((entity: any) => Promise.resolve(entity)),
          create: jest.fn().mockImplementation((_e: any, data: any) => data),
        };
        return cb(manager);
      });

      await expect(
        service.handleWebhook(
          'VNPAY',
          {
            vnp_TxnRef: 'VNPAY-payment-3',
            vnp_TmnCode: 'TESTCODE',
            vnp_Amount: '1000',
            vnp_TransactionNo: 'txn-3',
            vnp_ResponseCode: '00',
          },
          {},
          '127.0.0.1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects VNPay webhook when tmn code mismatches', async () => {
      const payment = {
        id: 'payment-4',
        bookingId: 'booking-4',
        providerCode: 'VNPAY',
        providerOrderId: 'VNPAY-payment-4',
        providerTxnId: null,
        amount: 100000,
        currency: 'VND',
        status: PaymentStatus.PENDING,
      } as PaymentEntity;

      (service as any).providers.VNPAY.verifyWebhook.mockResolvedValue({
        verified: true,
        paymentStatus: 'SUCCESS',
        providerOrderId: 'VNPAY-payment-4',
        providerTxnId: 'txn-4',
        raw: {},
      });

      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          findOne: jest
            .fn()
            .mockImplementation((entity: unknown) =>
              entity === PaymentEntity ? Promise.resolve(payment) : Promise.resolve(null),
            ),
          save: jest.fn().mockImplementation((entity: any) => Promise.resolve(entity)),
          create: jest.fn().mockImplementation((_e: any, data: any) => data),
        };
        return cb(manager);
      });

      await expect(
        service.handleWebhook(
          'VNPAY',
          {
            vnp_TxnRef: 'VNPAY-payment-4',
            vnp_TmnCode: 'WRONG',
            vnp_Amount: '10000000',
            vnp_TransactionNo: 'txn-4',
            vnp_ResponseCode: '00',
          },
          {},
          '127.0.0.1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects webhook when provider transaction id mismatches existing payment txn id', async () => {
      const payment = {
        id: 'payment-5',
        bookingId: 'booking-5',
        providerCode: 'VNPAY',
        providerOrderId: 'VNPAY-payment-5',
        providerTxnId: 'txn-old',
        amount: 100000,
        currency: 'VND',
        status: PaymentStatus.PENDING,
      } as PaymentEntity;

      (service as any).providers.VNPAY.verifyWebhook.mockResolvedValue({
        verified: true,
        paymentStatus: 'SUCCESS',
        providerOrderId: 'VNPAY-payment-5',
        providerTxnId: 'txn-new',
        raw: {},
      });

      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          findOne: jest
            .fn()
            .mockImplementation((entity: unknown) =>
              entity === PaymentEntity ? Promise.resolve(payment) : Promise.resolve(null),
            ),
          save: jest.fn().mockImplementation((entity: any) => Promise.resolve(entity)),
          create: jest.fn().mockImplementation((_e: any, data: any) => data),
        };
        return cb(manager);
      });

      await expect(
        service.handleWebhook(
          'VNPAY',
          {
            vnp_TxnRef: 'VNPAY-payment-5',
            vnp_TmnCode: 'TESTCODE',
            vnp_Amount: '10000000',
            vnp_TransactionNo: 'txn-new',
            vnp_ResponseCode: '00',
          },
          {},
          '127.0.0.1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('acknowledges duplicate terminal webhook without storing duplicate event', async () => {
      const payment = {
        id: 'payment-6',
        bookingId: 'booking-6',
        providerCode: 'VNPAY',
        providerOrderId: 'VNPAY-payment-6',
        providerTxnId: 'txn-6',
        amount: 100000,
        currency: 'VND',
        status: PaymentStatus.SUCCESS,
      } as PaymentEntity;

      const duplicatePayload = {
        vnp_TxnRef: 'VNPAY-payment-6',
        vnp_TmnCode: 'TESTCODE',
        vnp_Amount: '10000000',
        vnp_TransactionNo: 'txn-6',
        vnp_ResponseCode: '00',
      };
      const lastEvent = {
        payload: duplicatePayload,
        isVerified: true,
      } as unknown as PaymentEventEntity;

      (service as any).providers.VNPAY.verifyWebhook.mockResolvedValue({
        verified: true,
        paymentStatus: 'SUCCESS',
        providerOrderId: 'VNPAY-payment-6',
        providerTxnId: 'txn-6',
        raw: {},
      });

      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          findOne: jest.fn().mockImplementation((entity: unknown) => {
            if (entity === PaymentEntity) return Promise.resolve(payment);
            if (entity === PaymentEventEntity) return Promise.resolve(lastEvent);
            return Promise.resolve(null);
          }),
          save: jest.fn().mockImplementation((entity: any) => Promise.resolve(entity)),
          create: jest.fn().mockImplementation((_e: any, data: any) => data),
        };
        return cb(manager);
      });

      const result = await service.handleWebhook('VNPAY', duplicatePayload, {}, '127.0.0.1');
      expect(result.status).toBe(PaymentStatus.SUCCESS);
    });
  });

  describe('lookupPayment', () => {
    it('returns lookup details by providerOrderId', async () => {
      const payment = {
        id: 'payment-lookup-1',
        providerCode: 'VNPAY',
        providerOrderId: 'VNPAY-ORDER-1',
        providerTxnId: 'TXN-1',
        bookingId: 'booking-lookup-1',
        amount: 100000,
        currency: 'VND',
        status: PaymentStatus.SUCCESS,
        completedAt: new Date(),
      } as PaymentEntity;
      const booking = { id: 'booking-lookup-1', status: BookingStatus.CONFIRMED } as BookingEntity;

      paymentRepository.findOne.mockResolvedValue(payment);
      const bookingRepository = (service as any).bookingRepository;
      bookingRepository.findOne.mockResolvedValue(booking);
      const eventRepository = (service as any).paymentEventRepository;
      eventRepository.find.mockResolvedValue([
        {
          id: 'evt-1',
          eventType: 'WEBHOOK_IN',
          direction: 'IN',
          isVerified: true,
          createdAt: new Date(),
        },
      ]);

      const result = await service.lookupPayment({ providerOrderId: 'VNPAY-ORDER-1' });
      expect(result.paymentId).toBe('payment-lookup-1');
      expect(result.bookingStatus).toBe(BookingStatus.CONFIRMED);
      expect(result.lastEvents.length).toBe(1);
    });

    it('throws NotFoundException when lookup target does not exist', async () => {
      paymentRepository.findOne.mockResolvedValue(null);
      await expect(service.lookupPayment({ providerTxnId: 'NOT_FOUND' })).rejects.toThrow(
        'Payment not found',
      );
    });
  });

  describe('feature flag', () => {
    it('rejects initiate when payments are disabled', async () => {
      (service as any).paymentCfg.enabled = false;
      await expect(
        service.initiatePayment(
          { bookingId: '00000000-0000-0000-0000-000000000000', provider: 'VNPAY' },
          'user-1',
        ),
      ).rejects.toThrow('Payments are disabled by configuration');
    });
  });

  describe('reconcileStalePayments', () => {
    it('enqueues reconcile job when attempts are below max', async () => {
      paymentRepository.find.mockResolvedValue([{ id: 'payment-a' }]);
      paymentRepository.findOne.mockResolvedValue({ status: PaymentStatus.PENDING });
      const eventRepository = (service as any).paymentEventRepository;
      eventRepository.count.mockResolvedValue(1);

      await service.reconcileStalePayments();

      const queue = (service as any).paymentQueue;
      expect(queue.add).toHaveBeenCalledWith(
        'reconcile-payment',
        { paymentId: 'payment-a' },
        expect.any(Object),
      );
    });

    it('enqueues apply-successful-payment for stale reconciling payment', async () => {
      paymentRepository.find.mockResolvedValue([{ id: 'payment-r' }]);
      paymentRepository.findOne.mockResolvedValue({ status: PaymentStatus.RECONCILING });
      const eventRepository = (service as any).paymentEventRepository;
      eventRepository.count.mockResolvedValue(0);

      await service.reconcileStalePayments();

      const queue = (service as any).paymentQueue;
      expect(queue.add).toHaveBeenCalledWith(
        'apply-successful-payment',
        { paymentId: 'payment-r' },
        expect.any(Object),
      );
    });

    it('marks manual review and skips enqueue when attempts exceed max', async () => {
      paymentRepository.find.mockResolvedValue([{ id: 'payment-b' }]);
      paymentRepository.findOne.mockResolvedValue({
        status: PaymentStatus.PROCESSING,
        updatedAt: new Date(),
      });
      const eventRepository = (service as any).paymentEventRepository;
      eventRepository.count.mockResolvedValue(2);
      const manualReviewQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      eventRepository.createQueryBuilder.mockReturnValue(manualReviewQb);
      eventRepository.create.mockImplementation((v: any) => v);
      eventRepository.save.mockResolvedValue({});

      await service.reconcileStalePayments();

      const queue = (service as any).paymentQueue;
      expect(queue.add).not.toHaveBeenCalled();
      expect(eventRepository.save).toHaveBeenCalled();
    });

    it('enqueues refund-orphan-success when auto-refund is enabled for stale reconciling orphan', async () => {
      (service as any).paymentCfg.compensationAutoRefundEnabled = true;
      (service as any).paymentCfg.compensationOrphanMinutes = 30;
      paymentRepository.find.mockResolvedValue([{ id: 'payment-orphan' }]);
      paymentRepository.findOne.mockResolvedValue({
        status: PaymentStatus.RECONCILING,
        updatedAt: new Date(Date.now() - 31 * 60_000),
      });
      const eventRepository = (service as any).paymentEventRepository;
      eventRepository.count.mockResolvedValue(2);

      await service.reconcileStalePayments();

      const queue = (service as any).paymentQueue;
      expect(queue.add).toHaveBeenCalledWith(
        'refund-orphan-success',
        { paymentId: 'payment-orphan' },
        expect.any(Object),
      );
    });
  });

  describe('initiatePayment', () => {
    it('rejects when booking does not belong to current user', async () => {
      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          findOne: jest.fn().mockImplementation((entity: unknown) => {
            if (entity === PaymentProviderEntity)
              return Promise.resolve({ code: 'VNPAY', isActive: true });
            if (entity === BookingEntity) {
              return Promise.resolve({
                id: 'booking-1',
                userId: 'owner-user',
                status: BookingStatus.PENDING_PAYMENT,
                paymentDeadline: null,
                successfulPaymentId: null,
              });
            }
            if (entity === PaymentEntity) return Promise.resolve(null);
            return Promise.resolve(null);
          }),
          save: jest.fn(),
          create: jest.fn((_e: any, v: any) => v),
        };
        return cb(manager);
      });

      await expect(
        service.initiatePayment(
          { bookingId: '00000000-0000-0000-0000-000000000001', provider: 'VNPAY' },
          'other-user',
        ),
      ).rejects.toThrow('Booking does not belong to current user');
    });

    it('rejects when booking payment deadline is expired', async () => {
      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          findOne: jest.fn().mockImplementation((entity: unknown) => {
            if (entity === PaymentProviderEntity)
              return Promise.resolve({ code: 'VNPAY', isActive: true });
            if (entity === BookingEntity) {
              return Promise.resolve({
                id: 'booking-2',
                userId: 'user-2',
                status: BookingStatus.PENDING_PAYMENT,
                paymentDeadline: new Date(Date.now() - 60_000),
                successfulPaymentId: null,
              });
            }
            if (entity === PaymentEntity) return Promise.resolve(null);
            return Promise.resolve(null);
          }),
          save: jest.fn(),
          create: jest.fn((_e: any, v: any) => v),
        };
        return cb(manager);
      });

      await expect(
        service.initiatePayment(
          { bookingId: '00000000-0000-0000-0000-000000000002', provider: 'VNPAY' },
          'user-2',
        ),
      ).rejects.toThrow('Booking payment deadline has expired');
    });

    it('rejects when there is already an active payment attempt', async () => {
      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          findOne: jest.fn().mockImplementation((entity: unknown) => {
            if (entity === PaymentProviderEntity)
              return Promise.resolve({ code: 'VNPAY', isActive: true });
            if (entity === BookingEntity) {
              return Promise.resolve({
                id: 'booking-3',
                userId: 'user-3',
                status: BookingStatus.PENDING_PAYMENT,
                paymentDeadline: new Date(Date.now() + 60_000),
                successfulPaymentId: null,
              });
            }
            if (entity === PaymentEntity) {
              return Promise.resolve({
                id: 'payment-existing-1',
                status: PaymentStatus.PROCESSING,
              });
            }
            return Promise.resolve(null);
          }),
          save: jest.fn(),
          create: jest.fn((_e: any, v: any) => v),
        };
        return cb(manager);
      });

      await expect(
        service.initiatePayment(
          { bookingId: '00000000-0000-0000-0000-000000000003', provider: 'VNPAY' },
          'user-3',
        ),
      ).rejects.toThrow('An active payment attempt already exists for this booking');
    });
  });

  describe('listManualReviewPayments', () => {
    it('returns paginated manual review items', async () => {
      const qb = {
        innerJoin: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            id: 'payment-m1',
            providerCode: 'VNPAY',
            providerOrderId: 'VNPAY-order-1',
            providerTxnId: 'txn-1',
            paymentStatus: 'RECONCILING',
            amount: '100000.00',
            currency: 'VND',
            bookingId: 'booking-1',
            bookingStatus: 'PENDING_PAYMENT',
            manualReviewAt: new Date().toISOString(),
          },
        ]),
        getCount: jest.fn().mockResolvedValue(1),
      };
      paymentRepository.createQueryBuilder.mockReturnValue(qb);
      const eventRepository = (service as any).paymentEventRepository;
      const attemptQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ paymentId: 'payment-m1', attemptCount: '3' }]),
      };
      const latestQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            paymentId: 'payment-m1',
            createdAt: new Date('2026-05-24T10:00:00.000Z'),
            payload: { message: 'query timeout' },
          },
        ]),
      };
      eventRepository.createQueryBuilder
        .mockReturnValueOnce(attemptQb)
        .mockReturnValueOnce(latestQb);

      const result = await service.listManualReviewPayments({ page: 1, limit: 20 });
      expect(result.data.length).toBe(1);
      expect(result.meta.total).toBe(1);
      expect(result.data[0].paymentStatus).toBe('RECONCILING');
      expect(result.data[0].attemptCount).toBe(3);
      expect(result.data[0].lastReconcileError).toBe('query timeout');
    });

    it('applies providerOrderId and date range filters', async () => {
      const qb = {
        innerJoin: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getCount: jest.fn().mockResolvedValue(0),
      };
      paymentRepository.createQueryBuilder.mockReturnValue(qb);

      const eventRepository = (service as any).paymentEventRepository;
      const attemptQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      const latestQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      eventRepository.createQueryBuilder
        .mockReturnValueOnce(attemptQb)
        .mockReturnValueOnce(latestQb);

      await service.listManualReviewPayments({
        page: 1,
        limit: 20,
        providerOrderId: 'VNPAY-ORDER',
        dateFrom: '2026-05-20T00:00:00.000Z',
        dateTo: '2026-05-25T00:00:00.000Z',
      });

      expect(qb.andWhere).toHaveBeenCalledWith('payment.providerOrderId ILIKE :providerOrderId', {
        providerOrderId: '%VNPAY-ORDER%',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('event.createdAt >= :dateFrom', {
        dateFrom: new Date('2026-05-20T00:00:00.000Z'),
      });
      expect(qb.andWhere).toHaveBeenCalledWith('event.createdAt <= :dateTo', {
        dateTo: new Date('2026-05-25T00:00:00.000Z'),
      });
    });
  });

  describe('handleManualReviewAction', () => {
    it('requeues payment and writes MANUAL_REVIEW_REQUEUED event', async () => {
      paymentRepository.findOne.mockResolvedValue({
        id: 'payment-rq-1',
        status: PaymentStatus.RECONCILING,
      });
      const eventRepository = (service as any).paymentEventRepository;
      eventRepository.findOne.mockResolvedValue({ id: 'evt-manual' });
      eventRepository.create.mockImplementation((v: any) => v);
      eventRepository.save.mockResolvedValue({});

      const result = await service.handleManualReviewAction(
        'payment-rq-1',
        { action: 'REQUEUE', note: 'retry now' },
        'admin-1',
      );

      const queue = (service as any).paymentQueue;
      expect(queue.add).toHaveBeenCalledWith(
        'apply-successful-payment',
        { paymentId: 'payment-rq-1' },
        expect.any(Object),
      );
      expect(result.queued).toBe(true);
    });

    it('resolves payment and writes MANUAL_REVIEW_RESOLVED event', async () => {
      paymentRepository.findOne.mockResolvedValue({ id: 'payment-rs-1' });
      const eventRepository = (service as any).paymentEventRepository;
      eventRepository.findOne.mockResolvedValue({ id: 'evt-manual' });
      eventRepository.create.mockImplementation((v: any) => v);
      eventRepository.save.mockResolvedValue({});

      const result = await service.handleManualReviewAction(
        'payment-rs-1',
        { action: 'RESOLVE', note: 'verified externally' },
        'admin-2',
      );

      expect(result.resolved).toBe(true);
      expect(eventRepository.save).toHaveBeenCalled();
    });

    it('throws when payment is not in manual review queue', async () => {
      paymentRepository.findOne.mockResolvedValue({ id: 'payment-x' });
      const eventRepository = (service as any).paymentEventRepository;
      eventRepository.findOne.mockResolvedValue(null);

      await expect(
        service.handleManualReviewAction('payment-x', { action: 'RESOLVE' }, 'admin-3'),
      ).rejects.toThrow('Payment is not in manual review queue');
    });
  });
});
