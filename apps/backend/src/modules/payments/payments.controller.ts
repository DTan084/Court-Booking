import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@court-booking/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { initiatePaymentSchema } from './dto/initiate-payment.dto';
import { manualReviewActionSchema } from './dto/manual-review-action.dto';
import { manualReviewListSchema } from './dto/manual-review-list.dto';
import { paymentLookupSchema } from './dto/payment-lookup.dto';
import { refundPaymentSchema } from './dto/refund-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  initiate(
    @Body(new ZodValidationPipe(initiatePaymentSchema))
    body: { bookingId: string; provider: 'VNPAY' },
    @CurrentUser() user: { id?: string } | undefined,
    @Ip() ip: string,
  ) {
    if (!user?.id) throw new UnauthorizedException();
    return this.paymentsService.initiatePayment(body, user.id, ip ?? undefined);
  }

  @Get(':id/status')
  getStatus(@Param('id') id: string) {
    return this.paymentsService.getPaymentStatus(id);
  }

  @Get('admin/lookup')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  lookup(
    @Query(new ZodValidationPipe(paymentLookupSchema))
    query: {
      providerOrderId?: string;
      providerTxnId?: string;
    },
  ) {
    return this.paymentsService.lookupPayment(query);
  }

  @Get('admin/manual-review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  listManualReview(
    @Query(new ZodValidationPipe(manualReviewListSchema))
    query: {
      page: number;
      limit: number;
      status?: 'RECONCILING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
      providerOrderId?: string;
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    return this.paymentsService.listManualReviewPayments(query);
  }

  @Patch(':id/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  refund(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(refundPaymentSchema))
    body: { amount?: number; reason?: string },
  ) {
    return this.paymentsService.refund(id, body);
  }

  @Post(':id/reconcile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  reconcile(@Param('id') id: string) {
    return this.paymentsService.reconcilePayment(id);
  }

  @Post('admin/manual-review/:id/action')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  manualReviewAction(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(manualReviewActionSchema))
    body: { action: 'RESOLVE' | 'REQUEUE'; note?: string },
    @CurrentUser() user: { id?: string } | undefined,
  ) {
    if (!user?.id) throw new UnauthorizedException();
    return this.paymentsService.handleManualReviewAction(id, body, user.id);
  }
}
