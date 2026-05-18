'use client';

import { useCancelBooking } from '@/hooks/useBookings';
import { DoubleConfirmationDialog } from '@/components/shared/double-confirmation-dialog';
import { getBookingTimeWarning } from '@/lib/booking-utils';
import { useRuntimeSettings, runtimeSettingDefaults } from '@/hooks/useRuntimeSettings';
import type { Booking, Court } from '@/types';
import { formatDateTimeByTimezone } from '@/lib/datetime';

export type BookingWithCourt = Booking & { court: Court };

interface CancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingWithCourt;
}

export function CancelDialog({ open, onOpenChange, booking }: CancelDialogProps) {
  const { mutate: cancelBooking, isPending } = useCancelBooking();
  const { data: settings } = useRuntimeSettings();
  const timezone = settings?.defaultTimezone ?? runtimeSettingDefaults.defaultTimezone;
  const locale = 'vi-VN';

  const handleConfirm = () => {
    cancelBooking(booking.id, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  return (
    <DoubleConfirmationDialog
      isOpen={open}
      onClose={() => onOpenChange(false)}
      onConfirm={handleConfirm}
      isLoading={isPending}
      variant="destructive"
      title="Confirm Booking Cancellation"
      confirmText="Confirm Cancellation"
      description={
        <span>
          Are you sure you want to cancel the booking for <strong>{booking.court?.name}</strong>{' '}
          scheduled at{' '}
          <strong>{formatDateTimeByTimezone(booking.startTime, timezone, locale)}</strong>?
        </span>
      }
      warning={
        getBookingTimeWarning(
          booking.startTime,
          new Date(),
          settings?.noCancelBeforeHours ?? runtimeSettingDefaults.noCancelBeforeHours,
        ) ?? undefined
      }
    />
  );
}
