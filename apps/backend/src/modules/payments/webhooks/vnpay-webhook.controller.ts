import {
  Get,
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Ip,
  NotFoundException,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PaymentsService } from '../payments.service';
import { Logger } from '@nestjs/common';

type VnpIpnResponse = { RspCode: '00' | '01' | '02' | '04' | '97' | '99'; Message: string };

@Controller('payments/vnpay')
export class VNPayWebhookController {
  private readonly logger = new Logger(VNPayWebhookController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('ipn')
  @HttpCode(200)
  @Throttle({ default: { limit: 1000, ttl: 60000 } })
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

  @Get('ipn')
  @HttpCode(200)
  @Throttle({ default: { limit: 1000, ttl: 60000 } })
  async receiveGet(
    @Query() query: Record<string, unknown>,
    @Headers() headers: Record<string, string>,
    @Ip() ip: string,
  ) {
    try {
      await this.paymentsService.handleWebhook('VNPAY', query, headers, ip ?? null);
      return { RspCode: '00', Message: 'Confirm Success' };
    } catch (error) {
      return this.mapToVnpIpnResponse(error);
    }
  }

  private mapToVnpIpnResponse(error: unknown): VnpIpnResponse {
    if (error instanceof NotFoundException) {
      return { RspCode: '01', Message: 'Order not found' };
    }
    if (error instanceof BadRequestException) {
      const message = this.extractMessage(error).toLowerCase();
      if (message.includes('invalid signature')) {
        this.logWebhookSignal('payment_webhook_invalid_signature');
        return { RspCode: '97', Message: 'Invalid signature' };
      }
      if (message.includes('payments are disabled by configuration')) {
        return { RspCode: '99', Message: 'Payment disabled' };
      }
      if (message.includes('missing provider order id')) {
        return { RspCode: '01', Message: 'Order not found' };
      }
      if (
        message.includes('amount mismatch') ||
        message.includes('invalid vnpay amount') ||
        message.includes('invalid vnpay tmn code') ||
        message.includes('invalid payment currency')
      ) {
        return { RspCode: '04', Message: 'Invalid amount' };
      }
      return { RspCode: '99', Message: 'Input invalid' };
    }
    return { RspCode: '99', Message: 'Unknown error' };
  }

  private logWebhookSignal(event: string) {
    this.logger.warn(JSON.stringify({ event, provider: 'VNPAY' }));
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
