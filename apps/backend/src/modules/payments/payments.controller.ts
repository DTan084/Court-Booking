import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { initiatePaymentSchema } from './dto/initiate-payment.dto';
import { refundPaymentSchema } from './dto/refund-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  initiate(
    @Body(new ZodValidationPipe(initiatePaymentSchema))
    body: { bookingId: string; provider: 'VNPAY' | 'MOMO' | 'PAYPAL' },
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.initiatePayment(body, userId);
  }

  @Get(':id/status')
  getStatus(@Param('id') id: string) {
    return this.paymentsService.getPaymentStatus(id);
  }

  @Patch(':id/refund')
  refund(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(refundPaymentSchema))
    body: { amount?: number; reason?: string },
  ) {
    return this.paymentsService.refund(id, body);
  }
}
