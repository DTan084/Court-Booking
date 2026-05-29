import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VNPayWebhookController } from './vnpay-webhook.controller';
import { PaymentsService } from '../payments.service';

describe('VNPayWebhookController', () => {
  let controller: VNPayWebhookController;
  const createMockResponse = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { status, json };
  };
  const paymentsService = {
    handleWebhook: jest.fn(),
  } as unknown as PaymentsService;

  beforeEach(() => {
    controller = new VNPayWebhookController(paymentsService);
    jest.clearAllMocks();
  });

  it('returns success ack on successful webhook handling', async () => {
    (paymentsService.handleWebhook as jest.Mock).mockResolvedValue({ ok: true });
    const res = createMockResponse();

    await controller.receive({}, {}, '127.0.0.1', res as never);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ RspCode: '00', Message: 'Confirm Success' });
  });

  it('returns success ack on successful GET webhook handling', async () => {
    (paymentsService.handleWebhook as jest.Mock).mockResolvedValue({ ok: true });
    const res = createMockResponse();

    await controller.receiveGet({}, {}, '127.0.0.1', res as never);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ RspCode: '00', Message: 'Confirm Success' });
  });

  it('maps NotFoundException to order not found response', async () => {
    (paymentsService.handleWebhook as jest.Mock).mockRejectedValue(new NotFoundException());
    const res = createMockResponse();

    await controller.receive({}, {}, '127.0.0.1', res as never);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ RspCode: '01', Message: 'Order not found' });
  });

  it('maps invalid signature to RspCode 97', async () => {
    (paymentsService.handleWebhook as jest.Mock).mockRejectedValue(
      new BadRequestException('Invalid signature'),
    );
    const res = createMockResponse();

    await controller.receive({}, {}, '127.0.0.1', res as never);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ RspCode: '97', Message: 'Invalid signature' });
  });

  it('maps VNPay amount/tmn/currency validation errors to RspCode 04', async () => {
    (paymentsService.handleWebhook as jest.Mock).mockRejectedValue(
      new BadRequestException('Invalid VNPay tmn code'),
    );
    const res = createMockResponse();

    await controller.receive({}, {}, '127.0.0.1', res as never);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ RspCode: '04', Message: 'Invalid amount' });
  });

  it('maps disabled payment config to RspCode 99', async () => {
    (paymentsService.handleWebhook as jest.Mock).mockRejectedValue(
      new BadRequestException('Payments are disabled by configuration'),
    );
    const res = createMockResponse();

    await controller.receive({}, {}, '127.0.0.1', res as never);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ RspCode: '99', Message: 'Payment disabled' });
  });
});
