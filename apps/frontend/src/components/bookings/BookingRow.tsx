'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CancelDialog } from './CancelDialog';
import { formatCurrency, cn } from '@/lib/utils';
import { canCancelBooking } from '@/lib/booking-utils';
import {
  Archive,
  CreditCard,
  MapPin,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Info,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { BookingStatus, CourtStatus } from '@/types';
import { formatCountdown } from '@/lib/booking-utils';
import { CancelledBy } from '@court-booking/shared';
import type { Booking, Court, BookingStatus as BookingStatusType } from '@/types';
import { format } from 'date-fns';
import {
  formatDateByTimezone,
  formatDateTimeByTimezone,
  formatTimeByTimezone,
} from '@/lib/datetime';
import { useRuntimeSettings, runtimeSettingDefaults } from '@/hooks/useRuntimeSettings';

export type BookingWithCourt = Booking & { court: Court };

interface BookingRowProps {
  booking: BookingWithCourt;
  isHighlighted?: boolean;
}

const statusConfig: Record<
  BookingStatusType,
  { label: string; colorClass: string; barClass: string }
> = {
  [BookingStatus.PENDING_PAYMENT]: {
    label: 'Pending',
    colorClass: 'bg-orange-50 text-orange-600 border border-orange-100',
    barClass: 'bg-orange-600/20',
  },
  [BookingStatus.CONFIRMED]: {
    label: 'Confirmed',
    colorClass: 'bg-green-50 text-green-600 border border-green-100',
    barClass: 'bg-green-500',
  },
  [BookingStatus.CANCELLED]: {
    label: 'Cancelled',
    colorClass: 'bg-slate-100 text-slate-500 border border-slate-200',
    barClass: 'bg-slate-300',
  },
  [BookingStatus.COMPLETED]: {
    label: 'Completed',
    colorClass: 'bg-blue-50 text-blue-600 border border-blue-100',
    barClass: 'bg-blue-500',
  },
  [BookingStatus.EXPIRED]: {
    label: 'Expired',
    colorClass: 'bg-red-50 text-red-600 border border-red-100',
    barClass: 'bg-red-500',
  },
};

export function BookingRow({ booking, isHighlighted }: BookingRowProps) {
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const router = useRouter();
  const { data: settings } = useRuntimeSettings();
  const timezone = settings?.defaultTimezone ?? runtimeSettingDefaults.defaultTimezone;
  const currency = settings?.currency ?? runtimeSettingDefaults.currency;
  const cancelWithinHours = settings?.cancelWithinHours ?? runtimeSettingDefaults.cancelWithinHours;
  const noCancelBeforeHours =
    settings?.noCancelBeforeHours ?? runtimeSettingDefaults.noCancelBeforeHours;
  const locale = 'en-US';

  const startTime = new Date(booking.startTime);
  const endTime = new Date(booking.endTime);
  const statusInfo = statusConfig[booking.status];
  const courtName = booking.court?.name ?? 'Unknown court';
  const courtAddress = booking.court?.address ?? 'Unknown address';

  const dateStr = formatDateByTimezone(startTime, timezone, locale);
  const startTimeStr = formatTimeByTimezone(startTime, timezone, locale);
  const endTimeStr = formatTimeByTimezone(endTime, timezone, locale);

  const canCancel =
    booking.status === BookingStatus.PENDING_PAYMENT ||
    (booking.status === BookingStatus.CONFIRMED &&
      canCancelBooking(booking, new Date(), cancelWithinHours, noCancelBeforeHours));
  const canPay = booking.status === BookingStatus.PENDING_PAYMENT;
  const isUpcoming = endTime >= new Date();
  const canAddToCalendar = booking.status === BookingStatus.CONFIRMED && isUpcoming;
  const canBookAgain =
    booking.status === BookingStatus.COMPLETED ||
    booking.status === BookingStatus.CANCELLED ||
    booking.status === BookingStatus.EXPIRED;
  const isCourtUnavailable =
    booking.court?.deletedAt != null || booking.court?.status === CourtStatus.INACTIVE;
  const venueAvailabilityLabel = booking.court?.deletedAt
    ? 'No Longer Available'
    : booking.court?.status === CourtStatus.INACTIVE
      ? 'Unavailable'
      : null;
  const venueAvailabilityHint = booking.court?.deletedAt
    ? 'This venue has been removed from the active court list. You can still review this booking.'
    : booking.court?.status === CourtStatus.INACTIVE
      ? 'This venue is temporarily unavailable for new bookings.'
      : null;

  const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    `Court Booking - ${courtName}`,
  )}&dates=${format(startTime, "yyyyMMdd'T'HHmmss")}/${format(
    endTime,
    "yyyyMMdd'T'HHmmss",
  )}&details=${encodeURIComponent(`Booking at ${courtName}`)}&location=${encodeURIComponent(
    courtAddress,
  )}`;

  const isCancelledPaid = booking.status === BookingStatus.CANCELLED && !!booking.paidAt;
  const refundPending =
    booking.status === BookingStatus.CANCELLED && isCancelledPaid && !booking.refundedAt;
  const refundProcessed = booking.status === BookingStatus.CANCELLED && !!booking.refundedAt;
  const cancellationReason =
    booking.cancellationNote || booking.cancelledReason || 'No reason provided';
  const isSystemCancelled =
    booking.status === BookingStatus.CANCELLED &&
    (booking.cancelledBy === CancelledBy.SYSTEM ||
      /system|auto[-\s]?cancel|policy|maintenance|emergency/i.test(
        `${booking.cancelledReason ?? ''} ${booking.cancellationNote ?? ''}`,
      ));
  const cancellationContext =
    booking.status === BookingStatus.CANCELLED
      ? isSystemCancelled
        ? 'Cancelled by system'
        : booking.cancelledBy === CancelledBy.ADMIN
          ? 'Cancelled by admin'
          : 'Cancelled by you'
      : booking.status === BookingStatus.EXPIRED
        ? 'Payment expired'
        : null;
  const statusLabel = isSystemCancelled ? 'System Cancelled' : statusInfo.label;
  const isAdminCancelled =
    booking.status === BookingStatus.CANCELLED && booking.cancelledBy === CancelledBy.ADMIN;

  return (
    <>
      <div
        id={`booking-${booking.id}`}
        className={cn(
          'group relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden rounded-xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:border-orange-500',
          isHighlighted && 'ring-2 ring-orange-500 shadow-lg scale-[1.01] animate-pulse-subtle',
          booking.status === BookingStatus.CANCELLED && 'border-slate-300 bg-slate-50/50',
          booking.status === BookingStatus.EXPIRED && 'opacity-60 grayscale',
        )}
      >
        <div className={cn('absolute bottom-0 left-0 top-0 w-1', statusInfo.barClass)}></div>

        <div className="flex-grow">
          <div className="mb-2 flex items-center gap-3">
            <h3 className="text-xl font-bold text-slate-900">{courtName}</h3>
            <span
              className={cn(
                'rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest',
                statusInfo.colorClass,
                booking.status === BookingStatus.CANCELLED &&
                  'border-slate-300 bg-white text-slate-600',
                isSystemCancelled && 'border-red-100 bg-red-50 text-red-600',
                isAdminCancelled && 'border-rose-100 bg-rose-50 text-rose-700',
              )}
            >
              {isAdminCancelled ? 'Admin Cancelled' : statusLabel}
            </span>
            {venueAvailabilityLabel && (
              <span
                title={venueAvailabilityHint ?? undefined}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest',
                  booking.court?.deletedAt
                    ? 'border-slate-300 bg-slate-100 text-slate-600'
                    : 'border-amber-200 bg-amber-50 text-amber-700',
                )}
              >
                {booking.court?.deletedAt ? (
                  <Archive className="h-3 w-3" />
                ) : (
                  <Clock3 className="h-3 w-3" />
                )}
                {venueAvailabilityLabel}
              </span>
            )}
            {refundPending && (
              <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-orange-700">
                <Clock3 className="h-3 w-3" />
                Refund Pending
              </span>
            )}
            {refundProcessed && (
              <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-green-700">
                <CheckCircle2 className="h-3 w-3" />
                Refund Processed
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-6 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-400" />
              {courtAddress}
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              {dateStr}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              {startTimeStr} - {endTimeStr}
            </div>
            {booking.court?.maxPlayers ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] font-bold text-slate-500">
                  #
                </span>
                {booking.court.maxPlayers} players
              </div>
            ) : null}
          </div>

          {booking.status === BookingStatus.CONFIRMED && canCancel && (
            <p className="mt-3 text-xs font-medium text-green-600">
              Cancellable before{' '}
              {booking.latestCancellableTime
                ? formatDateTimeByTimezone(booking.latestCancellableTime, timezone, locale, {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                  })
                : '--'}
            </p>
          )}
          {booking.status === BookingStatus.CONFIRMED && !canCancel && (
            <p className="mt-3 text-xs italic text-slate-400">
              Cancellation period expired ({cancelWithinHours}h post-booking & {noCancelBeforeHours}
              h pre-match)
            </p>
          )}
          {cancellationContext && (
            <div
              className={cn(
                'mt-3 inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs',
                isSystemCancelled || isAdminCancelled
                  ? 'border-red-100 bg-red-50 text-red-700'
                  : 'border-slate-200 bg-white text-slate-600',
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="font-semibold">{cancellationContext}:</span>
              <span className="italic">{cancellationReason}</span>
            </div>
          )}
          {venueAvailabilityHint && (
            <p className="mt-3 flex items-start gap-2 text-xs text-slate-500">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{venueAvailabilityHint}</span>
            </p>
          )}
        </div>

        <div className="flex w-full flex-col items-end gap-3 md:w-auto">
          <p className="text-2xl font-bold text-slate-900">
            {formatCurrency(booking.totalPrice, currency)}
          </p>
          <div className="flex gap-2">
            {canPay && (
              <div className="flex flex-col items-end gap-1">
                <Button
                  onClick={() => router.push(`/checkout/${booking.id}`)}
                  className="flex items-center gap-2 rounded-lg bg-black px-5 py-2.5 font-semibold text-white transition-all hover:opacity-90"
                >
                  <CreditCard className="h-4 w-4" />
                  Pay Now
                </Button>
                <p className="text-[10px] font-bold uppercase tracking-tight text-orange-600">
                  Expires in {formatCountdown(booking.paymentDeadline ?? '')}
                </p>
              </div>
            )}

            {canCancel && (
              <Button
                variant="outline"
                onClick={() => setIsCancelDialogOpen(true)}
                className="rounded-lg border border-red-200 px-5 py-2.5 font-semibold text-red-600 transition-all hover:bg-red-50"
              >
                Cancel Booking
              </Button>
            )}

            {!canPay && !canCancel && (
              <>
                {canAddToCalendar && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(calendarUrl, '_blank', 'noopener,noreferrer')}
                    className="rounded-lg border border-orange-200 px-5 py-2.5 font-semibold text-orange-700 transition-all hover:bg-orange-50"
                  >
                    Add to Calendar
                  </Button>
                )}
                {canBookAgain && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      router.push(isCourtUnavailable ? '/courts' : `/courts/${booking.courtId}`)
                    }
                    className="rounded-lg border border-slate-200 px-5 py-2.5 font-semibold text-slate-700 transition-all hover:bg-slate-50"
                  >
                    {isCourtUnavailable ? 'Browse Courts' : 'Book Again'}
                  </Button>
                )}
                {!canAddToCalendar && !canBookAgain && (
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/bookings?highlight=${booking.id}`)}
                    className="rounded-lg border border-slate-200 px-5 py-2.5 font-semibold text-slate-600 transition-all hover:bg-slate-50"
                  >
                    Details
                  </Button>
                )}
              </>
            )}
            {(canPay || canCancel || canAddToCalendar || canBookAgain) && (
              <Button
                variant="outline"
                onClick={() => router.push(`/bookings?highlight=${booking.id}`)}
                className="rounded-lg border border-slate-200 px-5 py-2.5 font-semibold text-slate-600 transition-all hover:bg-slate-50"
              >
                Details
              </Button>
            )}
          </div>
        </div>
      </div>

      <CancelDialog
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        booking={booking}
      />
    </>
  );
}
