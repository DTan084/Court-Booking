import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { Role, BookingStatus, BookingSource } from '@court-booking/shared';
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
});

const adminBookingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(500).optional().default(10),
  status: z.nativeEnum(BookingStatus).optional(),
  bookingSource: z.nativeEnum(BookingSource).optional(),
  courtId: z.string().uuid().optional(),
  dateFrom: z.string().datetime({ offset: true }).optional(),
  dateTo: z.string().datetime({ offset: true }).optional(),
});

const adminOverviewQuerySchema = z.object({
  dateFrom: z.string().datetime({ offset: true }),
  dateTo: z.string().datetime({ offset: true }),
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

  @Patch(':id/check-in')
  checkIn(@Param('id') id: string) {
    return this.bookingsService.checkInBooking(id);
  }

  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Body() body: { cancelledReason?: string; cancellationNote?: string },
  ) {
    return this.bookingsService.adminCancelBooking(id, body);
  }

  @Patch(':id/refund')
  refund(@Param('id') id: string, @Body() body: { refundAmount: number }) {
    return this.bookingsService.refundBooking(id, body.refundAmount);
  }
}
