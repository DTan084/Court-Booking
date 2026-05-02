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
  @ApiBody({
    schema: {
      type: 'object',
      required: ['courtId', 'startTime', 'endTime'],
      properties: {
        courtId: {
          type: 'string',
          format: 'uuid',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        startTime: { type: 'string', format: 'date-time', example: '2024-06-15T08:00:00Z' },
        endTime: { type: 'string', format: 'date-time', example: '2024-06-15T10:00:00Z' },
      },
    },
  })
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
