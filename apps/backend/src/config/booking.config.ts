import { registerAs } from '@nestjs/config';

export default registerAs('booking', () => ({
  minCancelHours: parseInt(process.env.BOOKING_MIN_CANCEL_HOURS || '2', 10),
  maxBookingDurationHours: parseInt(process.env.BOOKING_MAX_DURATION_HOURS || '8', 10),
}));
