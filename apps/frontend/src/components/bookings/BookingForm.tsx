'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCreateBooking } from '@/hooks/useBookings';
import {
  calculateBookingPrice,
  formatCurrency,
  formatDate,
  buildLocalISO,
  isSlotBooked,
} from '@/lib/utils';
import type { CourtTimeSlot, BookedRange } from '@/types';

// ==================== TYPES & SCHEMA ====================

const bookingSchema = z
  .object({
    startHour: z.number().min(0).max(23),
    endHour: z.number().min(1).max(24),
  })
  .refine((data) => data.startHour < data.endHour, {
    message: 'Giờ kết thúc phải sau giờ bắt đầu',
    path: ['endHour'],
  });

type BookingFormData = z.infer<typeof bookingSchema>;

interface BookingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courtId: string;
  courtName: string;
  selectedDate: Date;
  timeSlots: CourtTimeSlot[];
  bookedRanges: BookedRange[];
}

// ==================== COMPONENT ====================

export function BookingForm({
  open,
  onOpenChange,
  courtId,
  courtName,
  selectedDate,
  timeSlots,
  bookedRanges,
}: BookingFormProps) {
  const { mutate: createBooking, isPending } = useCreateBooking();
  const [priceBreakdown, setPriceBreakdown] = useState<{
    totalPrice: number;
    coveredSlots: CourtTimeSlot[];
  } | null>(null);

  // Use local day-of-week — consistent with how user sees the calendar
  const dayOfWeek = selectedDate.getDay();

  // Slots for the selected day, sorted by hour
  const availableSlots = timeSlots
    .filter((slot) => slot.dayOfWeek === dayOfWeek)
    .sort((a, b) => a.startHour - b.startHour);

  // Filter past slots when selected date is today (local)
  const now = new Date();
  const isToday = formatDate(selectedDate) === formatDate(now);
  const currentHour = now.getHours();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      startHour: availableSlots[0]?.startHour ?? 0,
      endHour: availableSlots[0]?.endHour ?? 1,
    },
  });

  const startHour = watch('startHour');
  const endHour = watch('endHour');

  // Real-time price calculation
  useEffect(() => {
    if (startHour !== undefined && endHour !== undefined) {
      const result = calculateBookingPrice(timeSlots, dayOfWeek, startHour, endHour);
      setPriceBreakdown(result);
    }
  }, [startHour, endHour, timeSlots, dayOfWeek]);

  const onSubmit = (data: BookingFormData) => {
    if (!priceBreakdown) return;

    // Build ISO strings with local timezone offset so backend receives correct time
    const startTime = buildLocalISO(selectedDate, data.startHour);
    const endTime = buildLocalISO(selectedDate, data.endHour === 24 ? 0 : data.endHour);

    createBooking(
      { courtId, startTime, endTime },
      {
        onSuccess: () => {
          onOpenChange(false);
          reset();
        },
      },
    );
  };

  const handleClose = () => {
    onOpenChange(false);
    reset();
  };

  if (!open) return null;

  // Available start hours: not booked, not in the past
  const availableStartHours = availableSlots
    .filter((slot) => {
      if (isSlotBooked(slot.startHour, slot.endHour, bookedRanges)) return false;
      if (isToday && slot.startHour <= currentHour) return false;
      return true;
    })
    .map((slot) => slot.startHour);

  const uniqueStartHours = Array.from(new Set(availableStartHours)).sort((a, b) => a - b);
  const uniqueEndHours = Array.from(new Set(availableSlots.map((s) => s.endHour))).sort(
    (a, b) => a - b,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Đặt sân</h2>
            <p className="mt-1 text-sm text-gray-600">
              {courtName} — {formatDate(selectedDate)}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1 hover:bg-gray-100"
            disabled={isPending}
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {uniqueStartHours.length === 0 ? (
          <div className="rounded-lg bg-yellow-50 p-4 text-center text-sm text-yellow-700">
            Không còn khung giờ trống cho ngày này.
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Start Hour */}
            <div>
              <label htmlFor="startHour" className="block text-sm font-medium text-gray-700">
                Giờ bắt đầu
              </label>
              <select
                id="startHour"
                {...register('startHour', { valueAsNumber: true })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={isPending}
              >
                {uniqueStartHours.map((hour) => (
                  <option key={hour} value={hour}>
                    {String(hour).padStart(2, '0')}:00
                  </option>
                ))}
              </select>
              {errors.startHour && (
                <p className="mt-1 text-sm text-red-600">{errors.startHour.message}</p>
              )}
            </div>

            {/* End Hour */}
            <div>
              <label htmlFor="endHour" className="block text-sm font-medium text-gray-700">
                Giờ kết thúc
              </label>
              <select
                id="endHour"
                {...register('endHour', { valueAsNumber: true })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={isPending}
              >
                {uniqueEndHours.map((hour) => (
                  <option key={hour} value={hour}>
                    {String(hour === 24 ? 0 : hour).padStart(2, '0')}:00
                  </option>
                ))}
              </select>
              {errors.endHour && (
                <p className="mt-1 text-sm text-red-600">{errors.endHour.message}</p>
              )}
            </div>

            {/* Price Breakdown */}
            {priceBreakdown ? (
              <div className="rounded-lg bg-blue-50 p-4">
                <h3 className="mb-2 text-sm font-medium text-gray-900">Chi tiết giá</h3>
                <div className="space-y-1">
                  {priceBreakdown.coveredSlots.map((slot, i) => (
                    <div key={i} className="flex justify-between text-sm text-gray-700">
                      <span>
                        {String(slot.startHour).padStart(2, '0')}:00 —{' '}
                        {String(slot.endHour).padStart(2, '0')}:00
                      </span>
                      <span>{formatCurrency(slot.price)}</span>
                    </div>
                  ))}
                  <div className="mt-2 flex justify-between border-t border-blue-200 pt-2 font-semibold text-gray-900">
                    <span>Tổng cộng</span>
                    <span className="text-blue-600">
                      {formatCurrency(priceBreakdown.totalPrice)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-red-50 p-4">
                <p className="text-sm text-red-600">
                  Khung giờ không hợp lệ. Vui lòng chọn các khung giờ liên tiếp.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isPending}
                className="flex-1"
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isPending || !priceBreakdown} className="flex-1">
                {isPending ? 'Đang xử lý...' : 'Xác nhận đặt sân'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
