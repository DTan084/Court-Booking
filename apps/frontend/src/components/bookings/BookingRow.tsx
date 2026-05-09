'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CancelDialog } from './CancelDialog';
import { formatCurrency, cn } from '@/lib/utils';
import { canCancelBooking } from '@/lib/booking-utils';
import { CreditCard, MapPin, Calendar, Clock, DollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { BookingStatus } from '@/types';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { formatCountdown } from '@/lib/booking-utils';
import type { Booking, Court, BookingStatus as BookingStatusType } from '@/types';

// ==================== TYPES ====================

export type BookingWithCourt = Booking & { court: Court };

interface BookingRowProps {
  booking: BookingWithCourt;
  isHighlighted?: boolean;
}

// ==================== STATUS CONFIG ====================

const statusConfig: Record<BookingStatusType, { label: string; color: string }> = {
  [BookingStatus.PENDING_PAYMENT]: {
    label: 'Chờ thanh toán',
    color: 'bg-amber-100 text-amber-700',
  },
  [BookingStatus.CONFIRMED]: { label: 'Đã xác nhận', color: 'bg-green-100 text-green-700' },
  [BookingStatus.CANCELLED]: { label: 'Đã hủy', color: 'bg-gray-100 text-gray-700' },
  [BookingStatus.COMPLETED]: { label: 'Hoàn thành', color: 'bg-blue-100 text-blue-700' },
  [BookingStatus.EXPIRED]: { label: 'Hết hạn', color: 'bg-red-100 text-red-700' },
};

// ==================== COMPONENT ====================

export function BookingRow({ booking, isHighlighted }: BookingRowProps) {
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const router = useRouter();

  const startTime = new Date(booking.startTime);
  const endTime = new Date(booking.endTime);
  const statusInfo = statusConfig[booking.status];

  // Format date and time
  const dateStr = startTime.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const startTimeStr = startTime.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endTimeStr = endTime.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Check if booking can be cancelled (REQ-19)
  const canCancel = booking.status === BookingStatus.CONFIRMED && canCancelBooking(booking);

  const canPay = booking.status === BookingStatus.PENDING_PAYMENT;

  return (
    <>
      <div
        id={`booking-${booking.id}`}
        className={cn(
          'rounded-xl border bg-card p-5 shadow-sm transition-all duration-500',
          isHighlighted
            ? 'ring-2 ring-primary border-primary bg-primary/5 shadow-lg scale-[1.01] animate-pulse-subtle'
            : 'hover:shadow-md border-muted-foreground/20',
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: Booking Info */}
          <div className="flex-1 space-y-3">
            {/* Court Name */}
            <div>
              <h3 className="text-lg font-semibold text-foreground">{booking.court.name}</h3>
              <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="line-clamp-1">{booking.court.address}</span>
              </div>
            </div>

            {/* Date and Time */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{dateStr}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {startTimeStr} - {endTimeStr}
                </span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <span className="text-lg font-semibold text-primary">
                {formatCurrency(booking.totalPrice)}
              </span>
            </div>

            {/* Cancellation Deadline info (REQ-25.6) */}
            {booking.status === BookingStatus.CONFIRMED && canCancel && (
              <p className="text-xs text-green-600 font-medium">
                Có thể hủy trước{' '}
                {format(new Date(booking.latestCancellableTime), "HH:mm 'ngày' dd/MM", {
                  locale: vi,
                })}
              </p>
            )}
            {booking.status === BookingStatus.CONFIRMED && !canCancel && (
              <p className="text-xs text-muted-foreground italic">
                Đã quá thời hạn hủy (24h sau đặt & 12h trước chơi)
              </p>
            )}
          </div>

          {/* Right: Status and Actions */}
          <div className="flex flex-col items-start gap-3 sm:items-end">
            {/* Status Badge */}
            <span
              className={cn(
                'inline-block rounded-full px-3 py-1 text-sm font-medium',
                statusInfo.color,
              )}
            >
              {statusInfo.label}
            </span>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {canPay && (
                <div className="flex flex-col items-end gap-2">
                  <Button
                    size="sm"
                    onClick={() => router.push(`/checkout/${booking.id}`)}
                    className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 animate-pulse-subtle"
                  >
                    <CreditCard className="mr-1.5 h-4 w-4" />
                    Thanh toán ngay
                  </Button>
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-tight">
                    Hết hạn sau {formatCountdown(booking.paymentDeadline)}
                  </p>
                </div>
              )}

              {canCancel && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCancelDialogOpen(true)}
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  Hủy đặt
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Dialog */}
      <CancelDialog
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        booking={booking}
      />
    </>
  );
}
