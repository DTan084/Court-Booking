import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { Role, BookingStatus, BookingSource, CancelledBy } from '@court-booking/shared';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { BookingsService } from './bookings.service';

const adminCreateBookingSchema = z.object({
  courtId: z.string().uuid(),
  startTime: z.string().datetime({ offset: true }),
  endTime: z.string().datetime({ offset: true }),
  userId: z.string().uuid().optional().nullable(),
  guestName: z.string().max(100).optional(),
  guestPhone: z.string().max(20).optional(),
  note: z.string().max(500).optional(),
  paymentMethod: z.string().max(50).optional(),
  bookingSource: z.nativeEnum(BookingSource).optional(),
});

const adminUpdateBookingSchema = z.object({
  guestName: z.string().max(100).optional().nullable(),
  guestPhone: z.string().max(20).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  paymentMethod: z.string().max(50).optional().nullable(),
  cancelledReason: z.string().max(100).optional().nullable(),
  cancellationNote: z.string().max(500).optional().nullable(),
  cancelledBy: z.nativeEnum(CancelledBy).optional().nullable(),
});

const adminBookingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(500).optional().default(10),
  status: z.nativeEnum(BookingStatus).optional(),
  bookingSource: z.nativeEnum(BookingSource).optional(),
  courtId: z.string().uuid().optional(),
  dateFrom: z.string().datetime({ offset: true }).optional(),
  dateTo: z.string().datetime({ offset: true }).optional(),
  search: z.string().trim().min(1).optional(),
  sportTypeId: z.string().uuid().optional(),
  day: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  statusView: z.enum(['CANCELLED_GROUP', 'REFUND_PENDING']).optional(),
});

const adminOverviewQuerySchema = z.object({
  dateFrom: z.string().datetime({ offset: true }),
  dateTo: z.string().datetime({ offset: true }),
});

const adminAnalyticsQuerySchema = z.object({
  dateFrom: z.string().datetime({ offset: true }),
  dateTo: z.string().datetime({ offset: true }),
  courtId: z.string().uuid().optional(),
});

const adminRefundSchema = z.object({
  refundAmount: z.number().positive(),
});

const adminCancelSchema = z.object({
  cancelledReason: z.string().max(100).optional(),
  cancellationNote: z.string().max(500).optional(),
  cancelledBy: z.nativeEnum(CancelledBy).optional(),
});

@Controller('admin/bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminBookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(
    @Body(new ZodValidationPipe(adminCreateBookingSchema))
    body: z.infer<typeof adminCreateBookingSchema>,
  ) {
    return this.bookingsService.createAdminBooking(body);
  }

  @Get()
  list(
    @Query(new ZodValidationPipe(adminBookingsQuerySchema))
    query: z.infer<typeof adminBookingsQuerySchema>,
  ) {
    return this.bookingsService.getAdminBookings(
      query as {
        page?: number;
        limit?: number;
        status?: BookingStatus;
        bookingSource?: BookingSource;
        courtId?: string;
        dateFrom?: string;
        dateTo?: string;
        search?: string;
        sportTypeId?: string;
        day?: string;
        statusView?: 'CANCELLED_GROUP' | 'REFUND_PENDING';
      },
    );
  }

  @Get('overview')
  overview(
    @Query(new ZodValidationPipe(adminOverviewQuerySchema))
    query: z.infer<typeof adminOverviewQuerySchema>,
  ) {
    return this.bookingsService.getAdminOverview(query.dateFrom, query.dateTo);
  }

  @Get('analytics')
  analytics(
    @Query(new ZodValidationPipe(adminAnalyticsQuerySchema))
    query: z.infer<typeof adminAnalyticsQuerySchema>,
  ) {
    return this.bookingsService.getAdminCourtAnalytics(query.dateFrom, query.dateTo, query.courtId);
  }

  @Patch(':id/check-in')
  checkIn(@Param('id') id: string) {
    return this.bookingsService.checkInBooking(id);
  }

  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(adminCancelSchema))
    body: z.infer<typeof adminCancelSchema>,
  ) {
    return this.bookingsService.adminCancelBooking(id, body);
  }

  @Patch(':id/refund')
  refund(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(adminRefundSchema)) body: z.infer<typeof adminRefundSchema>,
  ) {
    return this.bookingsService.refundBooking(id, body.refundAmount);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(adminUpdateBookingSchema))
    body: z.infer<typeof adminUpdateBookingSchema>,
  ) {
    return this.bookingsService.updateAdminBooking(id, body);
  }
}
