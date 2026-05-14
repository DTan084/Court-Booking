'use client';

import { useCancelBooking } from '@/hooks/useBookings';
import { DoubleConfirmationDialog } from '@/components/shared/double-confirmation-dialog';
import { getBookingTimeWarning } from '@/lib/booking-utils';
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
  const timezone = 'Asia/Ho_Chi_Minh';
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
      title="Xac nhan huy dat san"
      confirmText="Xac nhan huy"
      description={
        <span>
          Ban co chac muon huy dat san <strong>{booking.court?.name}</strong> luc{' '}
          <strong>{formatDateTimeByTimezone(booking.startTime, timezone, locale)}</strong>?
        </span>
      }
      warning={getBookingTimeWarning(booking.startTime) ?? undefined}
    />
  );
}
