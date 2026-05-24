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
  });

  const mockGenericRepo = () => ({
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((v) => v),
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
          useValue: { providersEnabled: ['VNPAY'], reconcileStaleMinutes: 10 },
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
          findOne: jest.fn().mockResolvedValue(payment),
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
            vnp_Amount: '1000',
            vnp_TransactionNo: 'txn-3',
            vnp_ResponseCode: '00',
          },
          {},
          '127.0.0.1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
