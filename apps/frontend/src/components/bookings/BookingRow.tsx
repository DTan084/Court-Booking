'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CancelDialog } from './CancelDialog';
import { formatCurrency, cn } from '@/lib/utils';
import { canCancelBooking } from '@/lib/booking-utils';
import { CreditCard, MapPin, Calendar, Clock } from 'lucide-react';
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
          'group relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden rounded-xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:border-orange-500',
          isHighlighted && 'ring-2 ring-orange-500 shadow-lg scale-[1.01] animate-pulse-subtle',
          booking.status === BookingStatus.CANCELLED && 'opacity-75',
          booking.status === BookingStatus.EXPIRED && 'opacity-60 grayscale',
        )}
      >
        <div className={cn('absolute bottom-0 left-0 top-0 w-1', statusInfo.barClass)}></div>

        <div className="flex-grow">
          <div className="mb-2 flex items-center gap-3">
            <h3 className="text-xl font-bold text-slate-900">{booking.court.name}</h3>
            <span
              className={cn(
                'rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest',
                statusInfo.colorClass,
              )}
            >
              {statusInfo.label}
            </span>
          </div>

          <div className="flex flex-wrap gap-6 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-400" />
              {booking.court.address}
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              {dateStr}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              {startTimeStr} - {endTimeStr}
            </div>
          </div>

          {booking.status === BookingStatus.CONFIRMED && canCancel && (
            <p className="mt-3 text-xs font-medium text-green-600">
              Có thể hủy trước{' '}
              {booking.latestCancellableTime
                ? format(new Date(booking.latestCancellableTime), "HH:mm 'ngày' dd/MM", {
                    locale: vi,
                  })
                : '--'}
            </p>
          )}
          {booking.status === BookingStatus.CONFIRMED && !canCancel && (
            <p className="mt-3 text-xs italic text-slate-400">
              Đã quá thời hạn hủy (24h sau đặt & 12h trước chơi)
            </p>
          )}
        </div>

        <div className="flex w-full flex-col items-end gap-3 md:w-auto">
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(booking.totalPrice)}</p>
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
                  Hết hạn sau {formatCountdown(booking.paymentDeadline ?? '')}
                </p>
              </div>
            )}

            {canCancel && (
              <Button
                variant="outline"
                onClick={() => setIsCancelDialogOpen(true)}
                className="rounded-lg border border-red-200 px-5 py-2.5 font-semibold text-red-600 transition-all hover:bg-red-50"
              >
                Hủy đặt
              </Button>
            )}

            {!canPay && !canCancel && (
              <Button
                variant="outline"
                className="rounded-lg border border-slate-200 px-5 py-2.5 font-semibold text-slate-600 transition-all hover:bg-slate-50"
              >
                Details
              </Button>
            )}
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
