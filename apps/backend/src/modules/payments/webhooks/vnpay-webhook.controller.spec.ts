import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VNPayWebhookController } from './vnpay-webhook.controller';
import { PaymentsService } from '../payments.service';

describe('VNPayWebhookController', () => {
  let controller: VNPayWebhookController;
  const paymentsService = {
    handleWebhook: jest.fn(),
  } as unknown as PaymentsService;

  beforeEach(() => {
    controller = new VNPayWebhookController(paymentsService);
    jest.clearAllMocks();
  });

  it('returns success ack on successful webhook handling', async () => {
    (paymentsService.handleWebhook as jest.Mock).mockResolvedValue({ ok: true });

    const result = await controller.receive({}, {}, '127.0.0.1');
    expect(result).toEqual({ RspCode: '00', Message: 'Confirm Success' });
  });

  it('maps NotFoundException to order not found response', async () => {
    (paymentsService.handleWebhook as jest.Mock).mockRejectedValue(new NotFoundException());

    const result = await controller.receive({}, {}, '127.0.0.1');
    expect(result).toEqual({ RspCode: '01', Message: 'Order not found' });
  });

  it('maps invalid signature to RspCode 97', async () => {
    (paymentsService.handleWebhook as jest.Mock).mockRejectedValue(
      new BadRequestException('Invalid signature'),
    );

    const result = await controller.receive({}, {}, '127.0.0.1');
    expect(result).toEqual({ RspCode: '97', Message: 'Invalid signature' });
  });

  it('maps VNPay amount/tmn/currency validation errors to RspCode 04', async () => {
    (paymentsService.handleWebhook as jest.Mock).mockRejectedValue(
      new BadRequestException('Invalid VNPay tmn code'),
    );

    const result = await controller.receive({}, {}, '127.0.0.1');
    expect(result).toEqual({ RspCode: '04', Message: 'Invalid amount' });
  });

  it('maps disabled payment config to RspCode 99', async () => {
    (paymentsService.handleWebhook as jest.Mock).mockRejectedValue(
      new BadRequestException('Payments are disabled by configuration'),
    );

    const result = await controller.receive({}, {}, '127.0.0.1');
    expect(result).toEqual({ RspCode: '99', Message: 'Payment disabled' });
  });
});
