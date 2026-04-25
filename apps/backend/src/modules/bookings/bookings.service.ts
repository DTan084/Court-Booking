// TODO: Bookings Service
// - createBooking trong transaction
// - Overlap check: SELECT FOR UPDATE
// - cancelBooking — ownership + business rule checks
// - getSchedule — trả về slots theo ngày

import { Injectable } from '@nestjs/common';

@Injectable()
export class BookingsService {
  // TODO: Inject Booking Repository, Court Repository

  // TODO: createBooking(dto, userId)
  // TODO: cancelBooking(id, userId)
  // TODO: findMyBookings(userId, query)
  // TODO: getCourtSchedule(courtId, date)
}
