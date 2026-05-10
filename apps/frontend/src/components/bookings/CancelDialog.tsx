'use client';

import { useCancelBooking } from '@/hooks/useBookings';
import { DoubleConfirmationDialog } from '@/components/shared/double-confirmation-dialog';
import { getBookingTimeWarning } from '@/lib/booking-utils';
import type { Booking, Court } from '@/types';
import { format } from 'date-fns';

// ==================== TYPES ====================

export type BookingWithCourt = Booking & { court: Court };

interface CancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingWithCourt;
}

// ==================== COMPONENT ====================

export function CancelDialog({ open, onOpenChange, booking }: CancelDialogProps) {
  const { mutate: cancelBooking, isPending } = useCancelBooking();

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
      title="Xác nhận hủy đặt sân"
      confirmText="Xác nhận hủy"
      description={
        <span>
          Bạn có chắc muốn hủy đặt sân <strong>{booking.court?.name}</strong> lúc{' '}
          <strong>{format(new Date(booking.startTime), 'HH:mm - dd/MM/yyyy')}</strong>?
        </span>
      }
      warning={getBookingTimeWarning(booking.startTime) ?? undefined}
    />
  );
}
