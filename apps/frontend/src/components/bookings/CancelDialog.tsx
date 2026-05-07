'use client';

import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCancelBooking } from '@/hooks/useBookings';
import type { Booking, Court } from '@/types';

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

  if (!open) return null;

  const startTime = new Date(booking.startTime);
  const dateStr = startTime.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = startTime.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleConfirm = () => {
    cancelBooking(booking.id, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {/* Icon */}
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-red-100 p-3">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
        </div>

        {/* Title */}
        <h2 className="mb-2 text-center text-xl font-semibold text-gray-900">
          Xác nhận hủy đặt sân
        </h2>

        {/* Description */}
        <p className="mb-6 text-center text-sm text-gray-600">
          Bạn có chắc muốn hủy đặt sân <span className="font-medium">{booking.court.name}</span> lúc{' '}
          <span className="font-medium">
            {timeStr} - {dateStr}
          </span>
          ?
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="flex-1"
          >
            Hủy bỏ
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="flex-1 bg-red-600 hover:bg-red-700"
          >
            {isPending ? 'Đang hủy...' : 'Xác nhận'}
          </Button>
        </div>
      </div>
    </div>
  );
}
