import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { DataSource } from 'typeorm';
import { BookingStatus } from '@court-booking/shared';
import { PaymentsService } from './payments.service';
import { PaymentEntity, PaymentStatus } from '../../database/entities/payment.entity';
import { PaymentProviderEntity } from '../../database/entities/payment-provider.entity';
import { PaymentEventEntity } from '../../database/entities/payment-event.entity';
import { BookingEntity } from '../../database/entities/booking.entity';
import paymentsConfig from '../../config/payments.config';
import { VNPayProvider } from './providers/vnpay.provider';
import { MoMoProvider } from './providers/momo.provider';
import { PayPalProvider } from './providers/paypal.provider';

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
    code: 'MOMO',
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
          useValue: { providersEnabled: ['MOMO'], reconcileStaleMinutes: 10 },
        },
        { provide: getQueueToken('payment-jobs'), useFactory: mockQueue },
        { provide: DataSource, useFactory: mockDataSource },
        { provide: VNPayProvider, useFactory: mockProvider },
        { provide: MoMoProvider, useFactory: mockProvider },
        { provide: PayPalProvider, useFactory: mockProvider },
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
        providerCode: 'MOMO',
        providerOrderId: 'MOMO-payment-1',
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
      (service as any).providers.MOMO.queryPayment.mockResolvedValue({
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
        providerCode: 'MOMO',
        providerOrderId: 'MOMO-payment-2',
        status: PaymentStatus.PROCESSING,
        completedAt: null,
      } as PaymentEntity;
      const booking = {
        id: 'booking-2',
        status: BookingStatus.CANCELLED,
        successfulPaymentId: null,
      } as BookingEntity;

      paymentRepository.findOne.mockResolvedValue(payment);
      (service as any).providers.MOMO.queryPayment.mockResolvedValue({
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
});
