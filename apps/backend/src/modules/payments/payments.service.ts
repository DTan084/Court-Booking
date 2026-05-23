import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import { PaymentEntity, PaymentStatus } from '../../database/entities/payment.entity';
import {
  PaymentEventDirection,
  PaymentEventEntity,
} from '../../database/entities/payment-event.entity';
import { PaymentProviderEntity } from '../../database/entities/payment-provider.entity';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { MoMoProvider } from './providers/momo.provider';
import { PayPalProvider } from './providers/paypal.provider';
import {
  PaymentProviderAdapter,
  PaymentProviderCode,
} from './providers/payment-provider.interface';
import { VNPayProvider } from './providers/vnpay.provider';

@Injectable()
export class PaymentsService {
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
    vnpayProvider: VNPayProvider,
    momoProvider: MoMoProvider,
    paypalProvider: PayPalProvider,
  ) {
    this.providers = {
      VNPAY: vnpayProvider,
      MOMO: momoProvider,
      PAYPAL: paypalProvider,
    };
  }

  async initiatePayment(payload: InitiatePaymentDto, initiatedBy: string) {
    const booking = await this.bookingRepository.findOne({ where: { id: payload.bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');

    const provider = await this.paymentProviderRepository.findOne({
      where: { code: payload.provider },
    });
    if (!provider || !provider.isActive) {
      throw new BadRequestException(`Payment provider ${payload.provider} is not active`);
    }

    const payment = await this.paymentRepository.save(
      this.paymentRepository.create({
        bookingId: booking.id,
        providerCode: payload.provider,
        amount: Number(booking.totalPrice),
        currency: payload.provider === 'PAYPAL' ? 'USD' : 'VND',
        status: PaymentStatus.PENDING,
        initiatedBy,
      }),
    );

    const createResult = await this.providers[payload.provider].createPayment({
      paymentId: payment.id,
      bookingId: booking.id,
      amount: Number(payment.amount),
      currency: payment.currency,
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

  async refund(paymentId: string, payload: RefundPaymentDto) {
    const payment = await this.paymentRepository.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');

    const result = await this.providers[payment.providerCode as PaymentProviderCode].refund(
      {
        providerOrderId: payment.providerOrderId,
        providerTxnId: payment.providerTxnId,
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
    const verification = await this.providers[providerCode].verifyWebhook(payload, headers);

    const providerOrderId = verification.providerOrderId;
    if (!providerOrderId) {
      throw new BadRequestException('Missing provider order id');
    }

    const payment = await this.paymentRepository.findOne({
      where: { providerCode, providerOrderId },
    });
    if (!payment) throw new NotFoundException('Payment not found for webhook');

    await this.paymentEventRepository.save(
      this.paymentEventRepository.create({
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
      payment.providerTxnId = verification.providerTxnId;
    }

    if (verification.paymentStatus === 'SUCCESS') {
      payment.status = PaymentStatus.SUCCESS;
      payment.completedAt = new Date();
    } else if (verification.paymentStatus === 'FAILED') {
      payment.status = PaymentStatus.FAILED;
      payment.completedAt = new Date();
    } else if (verification.paymentStatus === 'CANCELLED') {
      payment.status = PaymentStatus.CANCELLED;
      payment.completedAt = new Date();
    } else {
      payment.status = PaymentStatus.PROCESSING;
    }

    await this.paymentRepository.save(payment);

    return { ok: true, paymentId: payment.id, status: payment.status };
  }
}
