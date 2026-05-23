import { Body, Controller, Headers, Ip, Post } from '@nestjs/common';
import { PaymentsService } from '../payments.service';

@Controller('payments/paypal')
export class PayPalWebhookController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('webhook')
  receive(
    @Body() body: Record<string, unknown>,
    @Headers() headers: Record<string, string>,
    @Ip() ip: string,
  ) {
    return this.paymentsService.handleWebhook('PAYPAL', body, headers, ip ?? null);
  }
}
