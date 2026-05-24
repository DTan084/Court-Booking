import { Body, Controller, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
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
    body: { bookingId: string; provider: 'VNPAY' },
    @CurrentUser() user: { id?: string } | undefined,
  ) {
    if (!user?.id) throw new UnauthorizedException();
    return this.paymentsService.initiatePayment(body, user.id);
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
