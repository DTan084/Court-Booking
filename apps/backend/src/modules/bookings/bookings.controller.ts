// TODO: Bookings Controller
// - POST /bookings — create booking
// - GET /bookings/me — user booking history
// - GET /courts/:id/schedule — court schedule by date
// - PATCH /bookings/:id/cancel — cancel booking

import { Controller } from '@nestjs/common';
import { BookingsService } from './bookings.service';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // TODO: Implement endpoints
}
