import { Body, Controller, Headers, Ip, Post } from '@nestjs/common';
import { PaymentsService } from '../payments.service';

@Controller('payments/vnpay')
export class VNPayWebhookController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('ipn')
  receive(
    @Body() body: Record<string, unknown>,
    @Headers() headers: Record<string, string>,
    @Ip() ip: string,
  ) {
    return this.paymentsService.handleWebhook('VNPAY', body, headers, ip ?? null);
  }
}
