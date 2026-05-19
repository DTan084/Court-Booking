import { differenceInHours, differenceInSeconds } from 'date-fns';
import { Booking } from '@court-booking/shared';

/**
 * REQ-27.1 — canCancelBooking
 * Returns true only when:
 *   (now - createdAt) < 24h  AND  (startTime - now) > 12h
 */
export function canCancelBooking(
  booking: Booking,
  now: Date = new Date(),
  cancelWithinHours = 24,
  noCancelBeforeHours = 12,
): boolean {
  const hoursSinceCreated = differenceInHours(now, new Date(booking.createdAt));
  const hoursUntilStart = differenceInHours(new Date(booking.startTime), now);
  return hoursSinceCreated < cancelWithinHours && hoursUntilStart > noCancelBeforeHours;
}

export function getBookingTimeWarning(
  startTime: string,
  now: Date = new Date(),
  noCancelBeforeHours = 12,
): string | null {
  const hours = differenceInHours(new Date(startTime), now);
  return hours < noCancelBeforeHours
    ? `This booking starts in less than ${noCancelBeforeHours} hours. You will not be able to cancel this booking.`
    : null;
}

/**
 * REQ-27.3 — formatCountdown
 * Returns MM:SS string. Returns '00:00' when deadline has passed.
 */
export function formatCountdown(deadlineIso: string, now: Date = new Date()): string {
  const diff = differenceInSeconds(new Date(deadlineIso), now);
  if (diff <= 0) return '00:00';
  const mm = String(Math.floor(diff / 60)).padStart(2, '0');
  const ss = String(diff % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
