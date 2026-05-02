// TODO: Bookings Controller
// - POST /bookings — create booking
// - GET /bookings/me — user booking history
// - GET /courts/:id/schedule — court schedule by date
// - PATCH /bookings/:id/cancel — cancel booking

import { Controller, Post, Body, UseGuards, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, createBookingSchema } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '@court-booking/shared';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new court booking' })
  @ApiResponse({ status: 201, description: 'Booking created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request (invalid input or past date)' })
  @ApiResponse({ status: 404, description: 'Court not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Court is already booked for the selected time slot',
  })
  @UsePipes(new ZodValidationPipe(createBookingSchema))
  async createBooking(@Body() createBookingDto: CreateBookingDto, @CurrentUser() user: JwtPayload) {
    return this.bookingsService.createBooking(createBookingDto, user.sub);
  }

  // TODO: Implement other endpoints
}
