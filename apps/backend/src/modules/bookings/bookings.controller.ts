import {
  BadRequestException,
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
import { ApiErrorResponse } from '../../common/swagger/api-response.swagger';
import { CreateBookingBody, BookingResponse, MyBookingsResponse } from './swagger/bookings.swagger';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new court booking' })
  @ApiBody({ type: CreateBookingBody })
  @ApiResponse({ status: 201, description: 'Booking created successfully', type: BookingResponse })
  @ApiResponse({ status: 400, description: 'Invalid input or past date', type: ApiErrorResponse })
  @ApiResponse({ status: 404, description: 'Court not found', type: ApiErrorResponse })
  @ApiResponse({
    status: 409,
    description: 'Court already booked for this time slot',
    type: ApiErrorResponse,
  })
  @UsePipes(new ZodValidationPipe(createBookingSchema))
  async createBooking(@Body() createBookingDto: CreateBookingDto, @CurrentUser() user: UserEntity) {
    return this.bookingsService.createBooking(createBookingDto, user.id);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a booking (policy windows are configurable in settings)' })
  @ApiResponse({
    status: 200,
    description: 'Booking cancelled successfully',
    type: BookingResponse,
  })
  @ApiResponse({ status: 400, description: 'Cancel policy violation', type: ApiErrorResponse })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not the booking owner',
    type: ApiErrorResponse,
  })
  @ApiResponse({ status: 404, description: 'Booking not found', type: ApiErrorResponse })
  async cancelBooking(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    return this.bookingsService.cancelBooking(id, user.id);
  }

  @Post(':id/confirm-payment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm payment for a PENDING_PAYMENT booking' })
  @ApiResponse({
    status: 200,
    description: 'Payment confirmed, booking is now CONFIRMED',
    type: BookingResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Booking expired or invalid state',
    type: ApiErrorResponse,
  })
  @ApiResponse({ status: 403, description: 'Forbidden', type: ApiErrorResponse })
  @ApiResponse({ status: 404, description: 'Booking not found', type: ApiErrorResponse })
  @ApiResponse({ status: 409, description: 'Already confirmed', type: ApiErrorResponse })
  confirmPayment() {
    throw new BadRequestException(
      'Deprecated endpoint. Use POST /api/v1/payments/initiate and payment provider webhook flow.',
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user booking history' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'EXPIRED'],
  })
  @ApiQuery({
    name: 'statusGroup',
    required: false,
    enum: ['failed'],
    description: 'failed = CANCELLED + EXPIRED',
  })
  @ApiQuery({ name: 'fromDate', required: false, type: String, description: 'ISO 8601 date' })
  @ApiQuery({ name: 'toDate', required: false, type: String, description: 'ISO 8601 date' })
  @ApiResponse({ status: 200, description: 'Paginated booking history', type: MyBookingsResponse })
  async getMyBookings(
    @Query(new ZodValidationPipe(getMyBookingsSchema)) query: GetMyBookingsDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.bookingsService.findMyBookings(user.id, query);
  }

  @Get('me/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user booking stats' })
  @ApiResponse({ status: 200, description: 'Booking stats retrieved successfully' })
  async getMyBookingStats(@CurrentUser() user: UserEntity) {
    return this.bookingsService.getMyBookingStats(user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single booking by ID (owner only)' })
  @ApiResponse({ status: 200, description: 'Booking detail', type: BookingResponse })
  @ApiResponse({ status: 404, description: 'Booking not found', type: ApiErrorResponse })
  async getBooking(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    return this.bookingsService.findOne(id, user.id);
  }
}
