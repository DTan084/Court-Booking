import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Ip,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { PaymentsService } from '../payments.service';

@Controller('payments/vnpay')
export class VNPayWebhookController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('ipn')
  @HttpCode(200)
  async receive(
    @Body() body: Record<string, unknown>,
    @Headers() headers: Record<string, string>,
    @Ip() ip: string,
  ) {
    try {
      await this.paymentsService.handleWebhook('VNPAY', body, headers, ip ?? null);
      return { RspCode: '00', Message: 'Confirm Success' };
    } catch (error) {
      return this.mapToVnpIpnResponse(error);
    }
  }

  private mapToVnpIpnResponse(error: unknown) {
    if (error instanceof NotFoundException) {
      return { RspCode: '01', Message: 'Order not found' };
    }
    if (error instanceof BadRequestException) {
      const message = this.extractMessage(error);
      if (message.includes('Invalid signature')) {
        return { RspCode: '97', Message: 'Invalid signature' };
      }
      if (message.includes('Payments are disabled by configuration')) {
        return { RspCode: '99', Message: 'Payment disabled' };
      }
      if (message.includes('Missing provider order id')) {
        return { RspCode: '01', Message: 'Order not found' };
      }
      if (message.includes('amount mismatch') || message.includes('invalid VNPay amount')) {
        return { RspCode: '04', Message: 'Invalid amount' };
      }
      if (message.includes('currency')) {
        return { RspCode: '04', Message: 'Invalid currency' };
      }
      return { RspCode: '99', Message: 'Input invalid' };
    }
    return { RspCode: '99', Message: 'Unknown error' };
  }

  private extractMessage(error: BadRequestException): string {
    const response = error.getResponse();
    if (typeof response === 'string') return response;
    if (response && typeof response === 'object') {
      const message = (response as { message?: unknown }).message;
      if (typeof message === 'string') return message;
      if (Array.isArray(message)) return message.join(', ');
    }
    return error.message || '';
  }
}
