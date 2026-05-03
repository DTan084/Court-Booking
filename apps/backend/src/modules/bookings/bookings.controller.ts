import {
  Controller,
  Post,
  Body,
  UseGuards,
  UsePipes,
  Patch,
  Param,
  Get,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, createBookingSchema } from './dto/create-booking.dto';
import { GetMyBookingsDto, getMyBookingsSchema } from './dto/get-my-bookings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserEntity } from '../../database/entities/user.entity';

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
  async createBooking(@Body() createBookingDto: CreateBookingDto, @CurrentUser() user: UserEntity) {
    return this.bookingsService.createBooking(createBookingDto, user.id);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiResponse({ status: 200, description: 'Booking cancelled successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad Request (already cancelled or too close to start time)',
  })
  @ApiResponse({ status: 403, description: 'Forbidden (not the owner)' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async cancelBooking(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    return this.bookingsService.cancelBooking(id, user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user booking history' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number', example: 1 })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
    example: 10,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['CONFIRMED', 'CANCELLED'],
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'fromDate',
    required: false,
    type: String,
    description: 'From date (ISO 8601)',
  })
  @ApiQuery({ name: 'toDate', required: false, type: String, description: 'To date (ISO 8601)' })
  @ApiResponse({ status: 200, description: 'Returns paginated booking list' })
  async getMyBookings(
    @Query(new ZodValidationPipe(getMyBookingsSchema)) query: GetMyBookingsDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.bookingsService.findMyBookings(user.id, query);
  }
}
