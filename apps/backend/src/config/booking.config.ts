import { registerAs } from '@nestjs/config';

export default registerAs('booking', () => ({
  minCancelHours: parseInt(process.env.BOOKING_MIN_CANCEL_HOURS || '2', 10),
  maxBookingDurationHours: parseInt(process.env.BOOKING_MAX_DURATION_HOURS || '8', 10),
  schedulerEnabled: !['0', 'false', 'off', 'no'].includes(
    (process.env.BOOKING_JOB_SCHEDULER_ENABLED || 'true').toLowerCase(),
  ),
  schedulerInitLockTtlMs: parseInt(process.env.BOOKING_JOB_SCHEDULER_LOCK_TTL_MS || '30000', 10),
}));
